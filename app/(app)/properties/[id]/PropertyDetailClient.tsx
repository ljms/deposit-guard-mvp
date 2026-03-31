"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { generateReportPdf, uploadAndStorePdf } from "@/lib/generateReportPdf";
import { notifyReportCompleteEmailClient } from "@/lib/notifyReportCompleteEmail";
import PageWrapper from "@/components/PageWrapper";
import { BottomNav } from "@/components/layout/BottomNav";
import { APP_MODAL_VIEWPORT_OFFSET_CLASS } from "@/components/layout/appModalViewport";

const fadeScaleTransition = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.2, ease: "easeInOut" as const },
};

type Property = {
  id: string | number;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  property_type?: string | null;
  tenancy_start_date?: string | null;
};

type Report = {
  id: string | number;
  property_id: string | number;
  storage_path: string | null;
  created_at: string | null;
  status?: string | null;
  report_type?: string | null;
};

type PropertyDetailClientProps = {
  property: Property;
  roomCount: number;
  reports: Report[];
  photoCountsByReportId: Record<string, number>;
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  "check-in": "Move-In",
  interim: "Interim",
  "check-out": "Move-Out",
};

const REPORT_TYPES = ["check-in", "interim", "check-out"] as const;

function getReportTypeLabel(reportType: string | null | undefined): string {
  return REPORT_TYPE_LABELS[reportType ?? "check-in"] ?? "Move-In Report";
}

function formatAddress(p: Property): string {
  const parts = [
    p.address_line1,
    p.address_line2,
    p.city,
    p.postcode,
  ].filter(Boolean);
  return parts.join(", ");
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMoveInDate(iso: string | null | undefined): string {
  if (!iso) return "Not specified";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PropertyDetailClient({
  property,
  roomCount,
  reports,
  photoCountsByReportId,
}: PropertyDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [showReportTypeModal, setShowReportTypeModal] = useState(false);
  const [showMoveInDateModal, setShowMoveInDateModal] = useState(false);
  const [moveInDateInput, setMoveInDateInput] = useState("");
  const [showCheckoutDateModal, setShowCheckoutDateModal] = useState(false);
  const [checkoutDateInput, setCheckoutDateInput] = useState("");
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showCompletedDeleteStep1, setShowCompletedDeleteStep1] =
    useState(false);
  const [showCompletedDeleteStep2, setShowCompletedDeleteStep2] =
    useState(false);

  useEffect(() => {
    if (searchParams.get("newReport") === "true") {
      setShowReportTypeModal(true);
      router.replace(`/properties/${property.id}`, { scroll: false });
    }
  }, [searchParams, property.id, router]);
  const [createReportLoading, setCreateReportLoading] = useState(false);
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const [deletingCompletedReportId, setDeletingCompletedReportId] = useState<
    string | number | null
  >(null);
  const [downloadingReportId, setDownloadingReportId] = useState<string | number | null>(null);
  const [pdfReady, setPdfReady] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const [reportPendingDelete, setReportPendingDelete] = useState<Report | null>(
    null
  );

  const propertyIdStr = String(property.id);
  const reportsForThisProperty = reports.filter(
    (r) => String((r as Report).property_id) === propertyIdStr
  );
  const inProgressReport = reportsForThisProperty.find(
    (r) => (r as Report).status === "in_progress"
  ) as Report | undefined;
  const hasReports = reportsForThisProperty.length > 0;
  const completedReportIds = reportsForThisProperty
    .filter((r) => (r as Report).status === "completed" || (r as Report).storage_path)
    .map((r) => String(r.id));

  useEffect(() => {
    if (completedReportIds.length === 0) return;
    const intervals: ReturnType<typeof setInterval>[] = [];
    completedReportIds.forEach((id, idx) => {
      const check = async () => {
        const { data } = await supabase.from("reports").select("pdf_url").eq("id", id).single();
        if (data?.pdf_url) {
          setPdfReady((prev) => ({ ...prev, [id]: true }));
          if (intervals[idx] != null) clearInterval(intervals[idx]);
        }
      };
      check();
      intervals[idx] = setInterval(check, 3000);
    });
    return () => intervals.forEach(clearInterval);
  }, [completedReportIds.join(",")]);

  async function handleCreateNewReportClick() {
    setError(null);
    if (inProgressReport) {
      setError(
        "You already have a report in progress for this property. Please complete or delete it before creating a new one."
      );
      return;
    }
    setShowReportTypeModal(true);
  }

  function formatDateLocalForReport(dateInput: string): string {
    if (!dateInput.trim()) return "";
    const d = new Date(dateInput + "T12:00:00");
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  async function handleSelectReportType(
    reportType: string,
    extra?: { movein_date_local?: string; checkout_date_local?: string }
  ) {
    setError(null);
    setCreateReportLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in to create a report.");
        setCreateReportLoading(false);
        return;
      }

      const { data: newReport, error: insertError } = await supabase
        .from("reports")
        .insert({
          property_id: property.id,
          user_id: user.id,
          status: "in_progress",
          report_type: reportType,
          storage_path: null,
          ...extra,
        })
        .select("id")
        .single();

      if (insertError || !newReport) {
        setError(insertError?.message ?? "Failed to create report.");
        setCreateReportLoading(false);
        return;
      }

      setShowReportTypeModal(false);
      setShowMoveInDateModal(false);
      setShowCheckoutDateModal(false);
      setDownloadingReportId(null);
      router.refresh();
      router.push(`/reports/${newReport.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setCreateReportLoading(false);
    }
  }

  function openMoveInDateModal() {
    const prefill = property.tenancy_start_date
      ? new Date(property.tenancy_start_date).toISOString().slice(0, 10)
      : "";
    setMoveInDateInput(prefill);
    setError(null);
    setShowReportTypeModal(false);
    setShowMoveInDateModal(true);
  }

  function openCheckoutDateModal() {
    setCheckoutDateInput(new Date().toISOString().slice(0, 10));
    setError(null);
    setShowReportTypeModal(false);
    setShowCheckoutDateModal(true);
  }

  function handleMoveInDateContinue() {
    if (!moveInDateInput.trim()) {
      setError("Please select a move-in date.");
      return;
    }
    const movein_date_local = formatDateLocalForReport(moveInDateInput);
    handleSelectReportType("check-in", { movein_date_local });
  }

  function handleCheckoutDateContinue() {
    if (!checkoutDateInput.trim()) {
      setError("Please select a move-out date.");
      return;
    }
    const checkout_date_local = formatDateLocalForReport(checkoutDateInput);
    handleSelectReportType("check-out", { checkout_date_local });
  }

  function openDeleteConfirmModal() {
    setError(null);
    setShowDeleteConfirmModal(true);
  }

  function openCompletedDeleteStepOne(report: Report) {
    setError(null);
    setReportPendingDelete(report);
    setShowCompletedDeleteStep1(true);
  }

  async function confirmDeleteInProgressReport() {
    setShowDeleteConfirmModal(false);
    setError(null);
    setDeletingInProgress(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in to delete a report.");
        setDeletingInProgress(false);
        return;
      }

      const { data: inProgressReport } = await supabase
        .from("reports")
        .select("id")
        .eq("property_id", property.id)
        .eq("user_id", user.id)
        .eq("status", "in_progress")
        .maybeSingle();

      if (inProgressReport) {
        const { data: photos } = await supabase
          .from("photos")
          .select("id, storage_path")
          .eq("report_id", inProgressReport.id);

        const paths = (photos ?? []).map((p) => p.storage_path).filter(Boolean);
        if (paths.length > 0) {
          await supabase.storage.from("photos").remove(paths);
        }

        await supabase.from("photos").delete().eq("report_id", inProgressReport.id);
        await supabase.from("rooms").delete().eq("report_id", inProgressReport.id);
      }

      await supabase
        .from("reports")
        .delete()
        .eq("property_id", property.id)
        .eq("user_id", user.id)
        .eq("status", "in_progress");

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setDeletingInProgress(false);
    }
  }

  async function permanentlyDeleteCompletedReport() {
    if (!reportPendingDelete) return;
    setShowCompletedDeleteStep2(false);
    setError(null);
    setDeletingCompletedReportId(reportPendingDelete.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in to delete a report.");
        setDeletingCompletedReportId(null);
        return;
      }

      if (reportPendingDelete.storage_path) {
        await supabase.storage
          .from("reports")
          .remove([reportPendingDelete.storage_path]);
      }

      // Delete only photos belonging to this report (report_id = reportPendingDelete.id).
      const { data: photos } = await supabase
        .from("photos")
        .select("id, storage_path")
        .eq("report_id", reportPendingDelete.id);

      const photoPaths = (photos ?? [])
        .map((p) => p.storage_path)
        .filter(Boolean) as string[];

      if (photoPaths.length > 0) {
        await supabase.storage.from("photos").remove(photoPaths);
      }

      await supabase
        .from("photos")
        .delete()
        .eq("report_id", reportPendingDelete.id);

      await supabase
        .from("reports")
        .delete()
        .eq("id", reportPendingDelete.id)
        .eq("user_id", user.id);

      setReportPendingDelete(null);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setDeletingCompletedReportId(null);
    }
  }

  async function handleDownload(report: Report, prop: Property) {
    setError(null);
    setDownloadingReportId(report.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated.");
        return;
      }

      const { data: reportData, error: reportError } = await supabase
        .from("reports")
        .select(
          "id, property_id, status, report_type, completed_at, movein_date_local, created_at, pdf_url"
        )
        .eq("id", report.id)
        .eq("user_id", user.id)
        .single();

      if (reportError || !reportData) {
        setError(reportError?.message ?? "Report not found.");
        return;
      }

      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("id, address_line1, address_line2, city, postcode, property_type, tenancy_start_date")
        .eq("id", prop.id)
        .eq("user_id", user.id)
        .single();

      if (propertyError || !propertyData) {
        setError(propertyError?.message ?? "Property not found.");
        return;
      }

      // If a stored PDF URL already exists, download directly without regenerating.
      if (reportData.pdf_url) {
        const res = await fetch(reportData.pdf_url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = reportData.pdf_url.split("/").pop()?.split("?")[0] ?? "report.pdf";
        a.click();
        URL.revokeObjectURL(blobUrl);
        return;
      }

      const { data: roomsData } = await supabase
        .from("rooms")
        .select("id, display_name, room_type, custom_name, notes")
        .eq("report_id", reportData.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      const result = await generateReportPdf(
        String(reportData.id),
        propertyData,
        {
          id: String(reportData.id),
          created_at: reportData.created_at,
          completed_at: reportData.completed_at,
          report_type: reportData.report_type,
          movein_date_local: reportData.movein_date_local,
        },
        roomsData ?? [],
        { supabase, userId: user.id },
        true
      );

      if (result) {
        const { blob, filename } = result;
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(blobUrl);

        const pdfUrl = await uploadAndStorePdf(blob, String(reportData.id), filename, supabase);
        try {
          if (user.email) {
            const { count: photoCount } = await supabase
              .from("photos")
              .select("id", { count: "exact", head: true })
              .eq("report_id", reportData.id)
              .eq("user_id", user.id);
            const meta = user.user_metadata ?? {};
            const displayName =
              (typeof meta.full_name === "string" && meta.full_name.trim()) ||
              (typeof meta.name === "string" && meta.name.trim()) ||
              undefined;
            notifyReportCompleteEmailClient({
              reportId: String(reportData.id),
              pdfUrl,
              propertyAddress: formatAddress(prop),
              roomCount: roomsData?.length ?? 0,
              photoCount: photoCount ?? 0,
              completedAtIso: reportData.completed_at,
              userEmail: user.email,
              userName: displayName,
            });
          }
        } catch (emailErr) {
          console.error("[PropertyDetailClient] report-complete email notify:", emailErr);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while downloading.");
    } finally {
      setDownloadingReportId(null);
    }
  }

  const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

  return (
    <PageWrapper>
    <div className="flex min-h-screen flex-col bg-[#F8F8F8] pb-20 lg:bg-transparent lg:pb-8">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="tap-feedback-touch active:opacity-75 p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-[#0F172A] bg-transparent border-none cursor-pointer"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Back to properties"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-[#0F172A]" style={fontStyle}>
              Property Details
            </h1>
          </div>
          <button
            type="button"
            onClick={handleCreateNewReportClick}
            className="px-2 py-1.5 text-xs rounded-lg bg-[#008bff] text-white font-medium hover:bg-[#0077e6] transition-colors md:px-4 md:py-2 md:text-sm"
            style={{ ...fontStyle, color: "#ffffff" }}
          >
            ＋ Create New Report
          </button>
        </div>
      </header>

      <div className="mx-auto hidden w-full max-w-[720px] items-center justify-between border-b border-gray-200 pb-6 pt-0 lg:flex lg:max-w-none">
        <h1 className="text-lg font-semibold text-[#0F172A]" style={fontStyle}>
          Property Details
        </h1>
        <button
          type="button"
          onClick={handleCreateNewReportClick}
          className="rounded-lg bg-[#008bff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0077e6]"
          style={{ ...fontStyle, color: "#ffffff" }}
        >
          ＋ Create New Report
        </button>
      </div>

      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 py-5 lg:mx-0 lg:max-w-none lg:px-0 lg:py-0">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}

        {/* Property info card */}
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <span className="text-lg shrink-0" aria-hidden>📍</span>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5" style={fontStyle}>
                  Property Address
                </p>
                <p className="text-[#0F172A] font-medium" style={fontStyle}>
                  {formatAddress(property) || "Unnamed property"}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-lg shrink-0" aria-hidden>🏠</span>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5" style={fontStyle}>
                  Property Type
                </p>
                <p className="text-[#0F172A] font-medium" style={fontStyle}>
                  {property.property_type ?? "Property"}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-lg shrink-0" aria-hidden>📅</span>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5" style={fontStyle}>
                  Tenancy Start Date
                </p>
                <p className="text-[#0F172A] font-medium" style={fontStyle}>
                  {formatMoveInDate(property.tenancy_start_date)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reports section */}
        <p className="text-sm font-semibold text-gray-600 mb-3" style={fontStyle}>
          Reports
        </p>

        {!hasReports ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <div className="flex justify-center my-0 py-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/checklist-graphic.png"
                alt=""
                className="max-w-[280px] w-full h-auto block my-0 py-0"
              />
            </div>
            <p className="text-gray-600 font-medium mb-1" style={fontStyle}>
              No reports yet
            </p>
            <p className="text-sm text-gray-500 mb-4" style={fontStyle}>
              Create your first report to start documenting this property.
            </p>
            <button
              type="button"
              onClick={() => setShowReportTypeModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#008bff] text-white font-medium text-sm"
              style={{ ...fontStyle, color: "#ffffff" }}
            >
              ＋ Create First Report
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {inProgressReport && (
              <Link
                href={`/reports/${inProgressReport.id}`}
                className="relative block cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:rounded-lg lg:border-[#e8e8eb] lg:shadow-none"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openDeleteConfirmModal();
                  }}
                  disabled={deletingInProgress}
                  className="absolute right-4 top-4 rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                  aria-label="Delete report"
                >
                  <svg className="text-red-600" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
                <div className="w-full">
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span className="text-sm text-gray-500" style={fontStyle}>
                      In Progress
                    </span>
                  </div>
                  <p className="mb-1 text-sm text-gray-600" style={fontStyle}>
                    {getReportTypeLabel((inProgressReport as Report).report_type)}
                  </p>
                  <p className="mb-4 text-sm text-gray-500" style={fontStyle}>
                    {photoCountsByReportId[String(inProgressReport?.id)] ?? 0} Photos • Started
                  </p>
                  <span
                    className="block w-full rounded-lg bg-[#008bff] py-2.5 text-center text-sm font-medium text-white hover:bg-[#0077e6]"
                    style={{ ...fontStyle, color: "#ffffff" }}
                  >
                    Continue
                  </span>
                </div>
              </Link>
            )}

            {reportsForThisProperty
              .filter((r) => (r as Report).status === "completed" || (r as Report).storage_path)
              .map((report) => {
                const isDownloading = downloadingReportId === report.id;
                return (
                  <div
                    key={report.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button, a")) return;
                      router.push(`/r/${report.id}`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/r/${report.id}`);
                      }
                    }}
                    className="relative cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:rounded-lg lg:border-[#e8e8eb] lg:shadow-none"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openCompletedDeleteStepOne(report as Report);
                      }}
                      disabled={deletingCompletedReportId === report.id}
                      className="absolute right-4 top-4 rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                      aria-label="Delete completed report"
                    >
                      <svg
                        className="text-red-600"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                    <div className="w-full">
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm text-gray-500" style={fontStyle}>
                          Completed
                        </span>
                      </div>
                      <p className="mb-1 text-sm text-gray-600" style={fontStyle}>
                        {getReportTypeLabel((report as Report & { report_type?: string }).report_type)}
                      </p>
                      <p className="mb-4 text-sm text-gray-500" style={fontStyle}>
                        {photoCountsByReportId[String(report.id)] ?? 0} Photos • {formatDate(report.created_at)}
                      </p>
                      <div className="flex gap-2">
                        <Link
                          href={`/r/${report.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 rounded-lg border border-gray-200 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                          style={fontStyle}
                        >
                          View Report
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (pdfReady[String(report.id)]) handleDownload(report as Report, property);
                          }}
                          disabled={!pdfReady[String(report.id)] || isDownloading}
                          className={
                            pdfReady[String(report.id)]
                              ? "flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              : "flex-1 cursor-not-allowed rounded-lg border border-gray-200 bg-gray-400 py-2 text-sm font-medium text-gray-500 opacity-50"
                          }
                          style={fontStyle}
                        >
                          {!pdfReady[String(report.id)] ? (
                            <>
                              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Preparing PDF…
                            </>
                          ) : isDownloading ? (
                            "Downloading…"
                          ) : (
                            "Download"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </main>

      {/* Remove report confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirmModal && (
          <motion.div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${APP_MODAL_VIEWPORT_OFFSET_CLASS}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() =>
                !deletingInProgress && setShowDeleteConfirmModal(false)
              }
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              initial={fadeScaleTransition.initial}
              animate={fadeScaleTransition.animate}
              exit={fadeScaleTransition.exit}
              transition={fadeScaleTransition.transition}
            >
              <h2
                className="text-lg font-semibold text-[#0F172A] mb-1"
                style={fontStyle}
              >
                Remove Report
              </h2>
              <p className="text-sm text-gray-500 mb-6" style={fontStyle}>
                Are you sure you want to remove this report?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(false)}
                  disabled={deletingInProgress}
                  className="shrink-0 py-2.5 px-5 rounded-lg font-medium text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{
                    ...fontStyle,
                    backgroundColor: "#008bff",
                    color: "#ffffff",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteInProgressReport}
                  disabled={deletingInProgress}
                  className="flex-1 min-w-0 py-2.5 px-4 rounded-lg font-medium text-sm text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                  style={{ ...fontStyle, color: "#ffffff" }}
                >
                  Yes, Remove Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showCompletedDeleteStep1 && reportPendingDelete && (
          <motion.div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${APP_MODAL_VIEWPORT_OFFSET_CLASS}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowCompletedDeleteStep1(false)}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              initial={fadeScaleTransition.initial}
              animate={fadeScaleTransition.animate}
              exit={fadeScaleTransition.exit}
              transition={fadeScaleTransition.transition}
            >
              <h2
                className="text-lg font-semibold text-[#0F172A] mb-1"
                style={fontStyle}
              >
                Delete Report?
              </h2>
              <p className="text-sm text-gray-500 mb-6" style={fontStyle}>
                Are you sure you want to delete this report? This action cannot
                be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompletedDeleteStep1(false);
                    setReportPendingDelete(null);
                  }}
                  className="shrink-0 py-2.5 px-5 rounded-lg font-medium text-sm text-white hover:opacity-90 transition-opacity"
                  style={{
                    ...fontStyle,
                    backgroundColor: "#008bff",
                    color: "#ffffff",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCompletedDeleteStep1(false);
                    setShowCompletedDeleteStep2(true);
                  }}
                  className="flex-1 min-w-0 py-2.5 px-4 rounded-lg font-medium text-sm text-white bg-red-500 hover:bg-red-600 transition-colors"
                  style={{ ...fontStyle, color: "#ffffff" }}
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showCompletedDeleteStep2 && reportPendingDelete && (
          <motion.div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${APP_MODAL_VIEWPORT_OFFSET_CLASS}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !deletingCompletedReportId && setShowCompletedDeleteStep2(false)}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              initial={fadeScaleTransition.initial}
              animate={fadeScaleTransition.animate}
              exit={fadeScaleTransition.exit}
              transition={fadeScaleTransition.transition}
            >
              <h2
                className="text-lg font-semibold text-[#0F172A] mb-1"
                style={fontStyle}
              >
                This is permanent
              </h2>
              <p className="text-sm text-gray-500 mb-6" style={fontStyle}>
                This will permanently delete this report and all of its photos.
                Are you absolutely sure?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCompletedDeleteStep2(false)}
                  disabled={Boolean(deletingCompletedReportId)}
                  className="shrink-0 py-2.5 px-5 rounded-lg font-medium text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{
                    ...fontStyle,
                    backgroundColor: "#008bff",
                    color: "#ffffff",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={permanentlyDeleteCompletedReport}
                  disabled={Boolean(deletingCompletedReportId)}
                  className="flex-1 min-w-0 py-2.5 px-4 rounded-lg font-medium text-sm text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                  style={{ ...fontStyle, color: "#ffffff" }}
                >
                  {deletingCompletedReportId
                    ? "Deleting…"
                    : "Yes, Permanently Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report type selection modal */}
      <AnimatePresence>
        {showReportTypeModal && (
          <motion.div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${APP_MODAL_VIEWPORT_OFFSET_CLASS}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !createReportLoading && setShowReportTypeModal(false)}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              initial={fadeScaleTransition.initial}
              animate={fadeScaleTransition.animate}
              exit={fadeScaleTransition.exit}
              transition={fadeScaleTransition.transition}
            >
            <h2 className="text-lg font-semibold text-[#0F172A] mb-1" style={fontStyle}>
              New report
            </h2>
            <p className="text-sm text-gray-500 mb-4" style={fontStyle}>
              Choose a report type for this property.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={createReportLoading}
                onClick={openMoveInDateModal}
                className="w-full py-3 px-4 rounded-xl border border-gray-200 bg-white text-[#0F172A] font-medium text-sm hover:bg-gray-50 hover:border-[#008bff]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={fontStyle}
              >
                {REPORT_TYPE_LABELS["check-in"]}
              </button>
              <button
                type="button"
                disabled={createReportLoading}
                onClick={() => handleSelectReportType("interim")}
                className="w-full py-3 px-4 rounded-xl border border-gray-200 bg-white text-[#0F172A] font-medium text-sm hover:bg-gray-50 hover:border-[#008bff]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={fontStyle}
              >
                {REPORT_TYPE_LABELS["interim"]}
              </button>
              <button
                type="button"
                disabled={createReportLoading}
                onClick={openCheckoutDateModal}
                className="w-full py-3 px-4 rounded-xl border border-gray-200 bg-white text-[#0F172A] font-medium text-sm hover:bg-gray-50 hover:border-[#008bff]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={fontStyle}
              >
                {REPORT_TYPE_LABELS["check-out"]}
              </button>
            </div>
            <button
              type="button"
              disabled={createReportLoading}
              onClick={() => setShowReportTypeModal(false)}
              className="mt-4 w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              style={fontStyle}
            >
              Cancel
            </button>
            </motion.div>
          </motion.div>
        )}

        {/* Tenancy start date modal (Move-In) */}
        {showMoveInDateModal && (
          <motion.div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${APP_MODAL_VIEWPORT_OFFSET_CLASS}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !createReportLoading && setShowMoveInDateModal(false)}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              initial={fadeScaleTransition.initial}
              animate={fadeScaleTransition.animate}
              exit={fadeScaleTransition.exit}
              transition={fadeScaleTransition.transition}
            >
              <h2 className="text-lg font-semibold text-[#0F172A] mb-1" style={fontStyle}>
                What is your move-in date?
              </h2>
              <input
                type="date"
                value={moveInDateInput}
                onChange={(e) => setMoveInDateInput(e.target.value)}
                className="w-full py-2.5 px-3 rounded-lg border border-gray-200 text-[#0F172A] text-base outline-none focus:border-[#008bff] focus:ring-2 focus:ring-[#008bff]/20 mt-4 mb-4"
                style={fontStyle}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowMoveInDateModal(false)}
                  disabled={createReportLoading}
                  className="shrink-0 py-2.5 px-5 rounded-lg font-medium text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ ...fontStyle, backgroundColor: "#008bff", color: "#ffffff" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMoveInDateContinue}
                  disabled={createReportLoading}
                  className="flex-1 min-w-0 py-2.5 px-4 rounded-lg font-medium text-sm text-white bg-[#008bff] hover:bg-[#0077e6] transition-colors disabled:opacity-50"
                  style={{ ...fontStyle, color: "#ffffff" }}
                >
                  {createReportLoading ? "Creating…" : "Continue"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Check-out date modal */}
        {showCheckoutDateModal && (
          <motion.div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${APP_MODAL_VIEWPORT_OFFSET_CLASS}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !createReportLoading && setShowCheckoutDateModal(false)}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              initial={fadeScaleTransition.initial}
              animate={fadeScaleTransition.animate}
              exit={fadeScaleTransition.exit}
              transition={fadeScaleTransition.transition}
            >
              <h2 className="text-lg font-semibold text-[#0F172A] mb-1" style={fontStyle}>
                What is your move-out date?
              </h2>
              <input
                type="date"
                value={checkoutDateInput}
                onChange={(e) => setCheckoutDateInput(e.target.value)}
                className="w-full py-2.5 px-3 rounded-lg border border-gray-200 text-[#0F172A] text-base outline-none focus:border-[#008bff] focus:ring-2 focus:ring-[#008bff]/20 mt-4 mb-4"
                style={fontStyle}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCheckoutDateModal(false)}
                  disabled={createReportLoading}
                  className="shrink-0 py-2.5 px-5 rounded-lg font-medium text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ ...fontStyle, backgroundColor: "#008bff", color: "#ffffff" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCheckoutDateContinue}
                  disabled={createReportLoading}
                  className="flex-1 min-w-0 py-2.5 px-4 rounded-lg font-medium text-sm text-white bg-[#008bff] hover:bg-[#0077e6] transition-colors disabled:opacity-50"
                  style={{ ...fontStyle, color: "#ffffff" }}
                >
                  {createReportLoading ? "Creating…" : "Continue"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
    </PageWrapper>
  );
}

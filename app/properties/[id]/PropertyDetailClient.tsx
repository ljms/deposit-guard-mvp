"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import PageWrapper from "@/components/PageWrapper";

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
  move_in_date?: string | null;
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
  photoCount: number;
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  "check-in": "Check-In",
  interim: "Interim",
  "check-out": "Check-Out",
};

const REPORT_TYPES = ["check-in", "interim", "check-out"] as const;

function getReportTypeLabel(reportType: string | null | undefined): string {
  return REPORT_TYPE_LABELS[reportType ?? "check-in"] ?? "Check-In Report";
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
  photoCount,
}: PropertyDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [showReportTypeModal, setShowReportTypeModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  useEffect(() => {
    if (searchParams.get("newReport") === "true") {
      setShowReportTypeModal(true);
      router.replace(`/properties/${property.id}`, { scroll: false });
    }
  }, [searchParams, property.id, router]);
  const [createReportLoading, setCreateReportLoading] = useState(false);
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const propertyIdStr = String(property.id);
  const reportsForThisProperty = reports.filter(
    (r) => String((r as Report).property_id) === propertyIdStr
  );
  const inProgressReport = reportsForThisProperty.find(
    (r) => (r as Report).status === "in_progress"
  ) as Report | undefined;
  const hasReports = reportsForThisProperty.length > 0;

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

  async function handleSelectReportType(reportType: string) {
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
          status: "in_progress", // new report from property detail is in progress until PDF is generated
          report_type: reportType,
          storage_path: null,
        })
        .select("id")
        .single();

      if (insertError || !newReport) {
        setError(insertError?.message ?? "Failed to create report.");
        setCreateReportLoading(false);
        return;
      }

      setShowReportTypeModal(false);
      setDownloadingPath(null); // clear any stale download state before navigation
      router.refresh();
      router.push(`/properties/${property.id}/reports/${newReport.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setCreateReportLoading(false);
    }
  }

  function openDeleteConfirmModal() {
    setError(null);
    setShowDeleteConfirmModal(true);
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

      const { data: photos } = await supabase
        .from("photos")
        .select("id, storage_path")
        .eq("property_id", property.id)
        .eq("user_id", user.id);

      const paths = (photos ?? []).map((p) => p.storage_path).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from("photos").remove(paths);
      }

      await supabase
        .from("photos")
        .delete()
        .eq("property_id", property.id)
        .eq("user_id", user.id);

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

  async function handleDownload(storagePath: string) {
    if (!storagePath) return;
    setError(null);
    setDownloadingPath(storagePath);
    try {
      const { data, error: urlError } = await supabase.storage
        .from("reports")
        .createSignedUrl(storagePath, 3600);
      if (urlError || !data?.signedUrl) {
        setError(urlError?.message ?? "Failed to generate download link.");
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      setError("Something went wrong while downloading.");
    } finally {
      setDownloadingPath(null);
    }
  }

  const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

  return (
    <PageWrapper>
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link
              href="/properties"
              className="tap-feedback-touch active:opacity-75 p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-[#0F172A]"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Back to properties"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
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

      <main className="flex-1 px-4 py-5 max-w-[720px] mx-auto w-full">
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
                  Move-In Date
                </p>
                <p className="text-[#0F172A] font-medium" style={fontStyle}>
                  {formatMoveInDate(property.move_in_date)}
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
              <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4 relative">
                <button
                  type="button"
                  onClick={openDeleteConfirmModal}
                  disabled={deletingInProgress}
                  className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  aria-label="Delete report"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-sm text-gray-500" style={fontStyle}>
                      In Progress
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1" style={fontStyle}>
                    {getReportTypeLabel((inProgressReport as Report).report_type)}
                  </p>
                  <p className="text-sm text-gray-500 mb-4" style={fontStyle}>
                    {photoCount} Photos • Started
                  </p>
                  <Link
                    href={`/properties/${property.id}/reports/${inProgressReport.id}`}
                    className="block w-full py-2.5 rounded-lg bg-[#008bff] text-white text-center font-medium text-sm hover:bg-[#0077e6]"
                    style={{ ...fontStyle, color: "#ffffff" }}
                  >
                    Continue
                  </Link>
                </div>
              </div>
            )}

            {reportsForThisProperty
              .filter((r) => (r as Report).status === "completed" || (r as Report).storage_path)
              .map((report) => {
                const hasStoragePath = Boolean((report as Report).storage_path);
                const isDownloading =
                  hasStoragePath &&
                  downloadingPath !== null &&
                  downloadingPath === (report as Report).storage_path;
                return (
                  <div
                    key={report.id}
                    className="rounded-xl bg-white border border-gray-200 shadow-sm p-4"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm text-gray-500" style={fontStyle}>
                        Completed
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1" style={fontStyle}>
                      {getReportTypeLabel((report as Report & { report_type?: string }).report_type)}
                    </p>
                    <p className="text-sm text-gray-500 mb-4" style={fontStyle}>
                      {photoCount} Photos • {formatDate(report.created_at)}
                    </p>
                    <div className="flex gap-2">
                      <Link
                        href={`/properties/${property.id}/reports/${report.id}`}
                        className="flex-1 py-2 rounded-lg border border-gray-200 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                        style={fontStyle}
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDownload((report as Report).storage_path ?? "")}
                        disabled={!hasStoragePath || isDownloading}
                        className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        style={fontStyle}
                      >
                        {isDownloading ? "Downloading…" : "Download"}
                      </button>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !deletingInProgress && setShowDeleteConfirmModal(false)}
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
              <h2 className="text-lg font-semibold text-[#0F172A] mb-1" style={fontStyle}>
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
                  style={{ ...fontStyle, backgroundColor: "#008bff", color: "#ffffff" }}
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
      </AnimatePresence>

      {/* Report type selection modal */}
      {showReportTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !createReportLoading && setShowReportTypeModal(false)}
            aria-hidden
          />
          <div
            className="relative w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[#0F172A] mb-1" style={fontStyle}>
              New report
            </h2>
            <p className="text-sm text-gray-500 mb-4" style={fontStyle}>
              Choose a report type for this property.
            </p>
            <div className="flex flex-col gap-2">
              {REPORT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={createReportLoading}
                  onClick={() => handleSelectReportType(type)}
                  className="w-full py-3 px-4 rounded-xl border border-gray-200 bg-white text-[#0F172A] font-medium text-sm hover:bg-gray-50 hover:border-[#008bff]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={fontStyle}
                >
                  {REPORT_TYPE_LABELS[type]}
                </button>
              ))}
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
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 w-full lg:max-w-[1080px] lg:left-1/2 lg:-translate-x-1/2 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
        <div className="flex justify-around max-w-[720px] mx-auto">
          <Link href="/dashboard" className="tap-feedback-touch flex flex-col items-center gap-1 py-1 text-gray-400 hover:text-[#008bff]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="text-xs font-medium" style={fontStyle}>Home</span>
          </Link>
          <Link href="/properties" className="tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 text-[#008bff]" style={{ WebkitTapHighlightColor: 'transparent' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-xs font-medium" style={fontStyle}>Properties</span>
          </Link>
          <Link href="/settings" className="tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 text-gray-400 hover:text-[#008bff]" style={{ WebkitTapHighlightColor: 'transparent' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span className="text-xs font-medium" style={fontStyle}>Settings</span>
          </Link>
          <button type="button" className="active:opacity-75 flex flex-col items-center gap-1 py-1 text-gray-400 cursor-default" style={{ WebkitTapHighlightColor: 'transparent' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="text-xs font-medium" style={fontStyle}>Help</span>
          </button>
        </div>
      </nav>
    </div>
    </PageWrapper>
  );
}

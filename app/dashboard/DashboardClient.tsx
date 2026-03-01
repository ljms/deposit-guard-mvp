"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ReportFlowModal } from "@/components/ReportFlowModal";
import PageWrapper from "@/components/PageWrapper";

type Report = {
  id: string | number;
  property_id: string | number;
  storage_path: string | null;
  created_at: string | null;
  status?: string | null;
  report_type?: string | null;
};

type Property = {
  id: string | number;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  created_at?: string | null;
};


type DashboardClientProps = {
  userName: string;
  properties: Property[];
  reports: Report[];
  roomCounts: Record<string, number>;
  bedroomCounts: Record<string, number>;
  bathroomCounts: Record<string, number>;
  photoCounts: Record<string, number>;
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  "check-in": "Check-In Report",
  interim: "Interim Report",
  "check-out": "Check-Out Report",
};

function getReportTypeLabel(reportType: string | null | undefined): string {
  return REPORT_TYPE_LABELS[reportType ?? "check-in"] ?? "Check-In Report";
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatAddress(property: Property): string {
  const parts = [
    property.address_line1,
    property.address_line2,
    property.city,
    property.postcode,
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

export function DashboardClient({
  userName,
  properties,
  reports,
  roomCounts,
  bedroomCounts,
  bathroomCounts,
  photoCounts,
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [showReportModal, setShowReportModal] = useState(false);
  const [sortByStatus, setSortByStatus] = useState(true); // true = status order, false = date

  useEffect(() => {
    if (searchParams.get("newReport") === "1") {
      setShowReportModal(true);
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, router]);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build report items from ALL reports (one card per report) — in_progress and completed
  const reportItems = reports
    .map((report: Report) => {
      const property = properties.find(
        (p) => String(p.id) === String(report.property_id)
      );
      if (!property) return null;
      const isCompleted =
        report.status === "completed" || Boolean(report.storage_path);
      const roomCount = roomCounts[String(property.id)] ?? 0;
      const photoCount = photoCounts[String(property.id)] ?? 0;
      const date = report.created_at ?? property.created_at ?? null;
      return {
        property,
        report,
        isCompleted,
        roomCount,
        photoCount,
        date,
        reportType: report.report_type,
      };
    })
    .filter(Boolean) as Array<{
    property: Property;
    report: Report;
    isCompleted: boolean;
    roomCount: number;
    photoCount: number;
    date: string | null;
    reportType: string | null | undefined;
  }>;

  const totalReports = reportItems.length;
  const completedReports = reportItems.filter((i) => i.isCompleted).length;
  const incompleteReports = totalReports - completedReports;

  const sortedItems = [...reportItems].sort((a, b) => {
    if (sortByStatus) {
      // In progress first, then completed
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    }
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  async function handleDownload(storagePath: string) {
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

  function openDeletePropertyModal(property: Property) {
    setError(null);
    setPropertyToDelete(property);
  }

  async function confirmDeleteProperty() {
    const property = propertyToDelete;
    if (!property) return;
    setPropertyToDelete(null);
    setError(null);
    setDeletingId(property.id);
    try {
      const { error: deleteError } = await supabase
        .from("properties")
        .delete()
        .eq("id", property.id);
      if (deleteError) {
        setError(deleteError.message ?? "Unable to delete.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

  return (
    <PageWrapper>
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#E0F2FE] flex items-center justify-center">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0284C7"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h1
              className="text-lg font-semibold text-[#0F172A]"
              style={fontStyle}
            >
              Dashboard
            </h1>
          </div>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/");
              router.refresh();
            }}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
            style={fontStyle}
          >
            Log Out
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 max-w-[720px] mx-auto w-full">
        {/* Greeting */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            <span className="text-lg text-gray-500">👤</span>
          </div>
          <div>
            <h2
              className="text-lg font-semibold text-[#0F172A]"
              style={fontStyle}
            >
              Hi {userName} 👋
            </h2>
            <p className="text-sm text-gray-500" style={fontStyle}>
              {getTimeBasedGreeting()}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}

        {/* Overview stats */}
        <p
          className="text-sm font-semibold text-gray-600 mb-3"
          style={fontStyle}
        >
          Overview
        </p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl p-4 bg-[#1a1a86] text-white">
            <p className="text-2xl font-bold" style={fontStyle}>
              {totalReports}
            </p>
            <p className="text-xs text-white/90" style={fontStyle}>
              Total Reports
            </p>
          </div>
          <div className="rounded-xl p-4 bg-[#0ba5de] text-white">
            <p className="text-2xl font-bold" style={fontStyle}>
              {completedReports}
            </p>
            <p className="text-xs text-white/90" style={fontStyle}>
              Completed Reports
            </p>
          </div>
          <div className="rounded-xl p-4 bg-[#00d9e4] text-white">
            <p className="text-2xl font-bold" style={fontStyle}>
              {incompleteReports}
            </p>
            <p className="text-xs text-white/90" style={fontStyle}>
              Incomplete Reports
            </p>
          </div>
        </div>

        {/* Create New Report */}
        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#008bff] text-white font-semibold text-base mb-6 shadow-sm hover:bg-[#0077e6] transition-colors"
          style={{ ...fontStyle, color: "#ffffff" }}
        >
          <span className="text-xl leading-none">＋</span>
          Create New Report
        </button>

        {/* Reports list */}
        <div className="flex items-center justify-between mb-3">
          <p
            className="text-sm font-semibold text-gray-600"
            style={fontStyle}
          >
            Reports
          </p>
          <button
            type="button"
            onClick={() => setSortByStatus((s) => !s)}
            className="flex items-center gap-1 text-sm text-[#008bff] font-medium"
            style={fontStyle}
          >
            Report Status
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M7 15l5 5 5-5" />
              <path d="M7 9l5-5 5 5" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {sortedItems.length === 0 ? (
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
              <p className="text-sm text-gray-500" style={fontStyle}>
                Create your first report to start documenting your rental.
              </p>
            </div>
          ) : (
            sortedItems.map(({ property, report, isCompleted, photoCount, date, reportType }) => (
              <div
                key={report.id}
                className="rounded-xl bg-white border border-gray-200 shadow-sm p-4 relative"
              >
                {/* Delete (In Progress) or Share (Completed) */}
                <div className="absolute top-3 right-3">
                  {isCompleted ? (
                    <button
                      type="button"
                      className="p-1.5 text-[#008bff] hover:bg-blue-50 rounded-lg"
                      aria-label="Share"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openDeletePropertyModal(property)}
                      disabled={deletingId === property.id}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      aria-label="Delete"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCompleted ? "bg-green-500" : "bg-amber-400"
                    }`}
                  />
                  <span
                    className="text-sm text-gray-500"
                    style={fontStyle}
                  >
                    {isCompleted ? "Completed" : "In Progress"}
                  </span>
                </div>

                {/* Address */}
                <p
                  className="text-base font-semibold text-[#0F172A] mb-3 pr-8"
                  style={fontStyle}
                >
                  {formatAddress(property)}
                </p>

                {/* Meta row */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    {getReportTypeLabel(reportType)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    {photoCount} Photos
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {formatDate(date)}
                  </span>
                </div>

                {/* Actions */}
                {isCompleted ? (
                  <div className="flex gap-2">
                    <Link
                      href={`/properties/${property.id}/reports/${report?.id ?? property.id}`}
                      className="flex-1 py-2 rounded-lg border border-gray-200 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                      style={fontStyle}
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => report?.storage_path && handleDownload(report.storage_path)}
                      disabled={downloadingPath === report?.storage_path}
                      className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      style={fontStyle}
                    >
                      {downloadingPath === report?.storage_path ? "Downloading…" : "Download"}
                    </button>
                  </div>
                ) : (
                  <Link
                    href={`/properties/${property.id}/reports/${report?.id ?? property.id}`}
                    className="block w-full py-2.5 rounded-lg bg-[#008bff] text-white text-center font-medium text-sm hover:bg-[#0077e6]"
                    style={{ ...fontStyle, color: "#ffffff" }}
                  >
                    Continue
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {propertyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-1" style={fontStyle}>
              Delete Report
            </h2>
            <p className="text-sm text-gray-500 mb-6" style={fontStyle}>
              Are you sure you want to delete this report? This will delete the property and all associated data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPropertyToDelete(null)}
                className="shrink-0 py-2.5 px-5 rounded-lg font-medium text-sm text-white hover:bg-opacity-90 transition-opacity"
                style={{ ...fontStyle, backgroundColor: "#008bff", color: "#ffffff" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProperty}
                disabled={deletingId === propertyToDelete.id}
                className="flex-1 min-w-0 py-2.5 px-4 rounded-lg font-medium text-sm text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                style={{ ...fontStyle, color: "#ffffff" }}
              >
                {deletingId === propertyToDelete.id ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportFlowModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onComplete={() => {
          setShowReportModal(false);
          router.refresh();
        }}
        onPropertySelected={(propertyId) => {
          setShowReportModal(false);
          router.push(`/properties/${propertyId}?newReport=true`);
          router.refresh();
        }}
        onPropertyCreated={(propertyId) => {
          setShowReportModal(false);
          router.push(`/properties/${propertyId}?newReport=true`);
          router.refresh();
        }}
      />

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 w-full lg:max-w-[1080px] lg:left-1/2 lg:-translate-x-1/2 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
        <div className="flex items-center justify-around max-w-[720px] mx-auto">
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-1 py-1 text-[#008bff]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="text-xs font-medium" style={fontStyle}>Home</span>
          </Link>
          <Link
            href="/properties"
            className="flex flex-col items-center gap-1 py-1 text-gray-400"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-xs font-medium" style={fontStyle}>Properties</span>
          </Link>
          <Link
            href="/settings"
            className="flex flex-col items-center gap-1 py-1 text-gray-400"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span className="text-xs font-medium" style={fontStyle}>Settings</span>
          </Link>
          <button
            type="button"
            className="flex flex-col items-center gap-1 py-1 text-gray-400 cursor-default"
          >
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

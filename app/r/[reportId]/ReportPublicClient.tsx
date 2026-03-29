"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { generateReportPdf, uploadAndStorePdf } from "@/lib/generateReportPdf";
import { LEGAL_PRIVACY_URL, LEGAL_TERMS_URL } from "@/lib/legal-external-links";

type Property = {
  id: string | number;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  property_type?: string | null;
  tenancy_start_date?: string | null;
};

type Room = {
  id: string | number;
  display_name: string | null;
  room_type: string;
  custom_name: string | null;
  notes?: string | null;
};

type Report = {
  id: string;
  created_at: string | null;
  completed_at: string | null;
  report_type: string | null;
  movein_date_local?: string | null;
};

type PhotoWithUrl = {
  id: string;
  room_id: string;
  note: string | null;
  taken_at: string | null;
  signedUrl: string;
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  "check-in": "Move-In Report",
  interim: "Interim Report",
  "check-out": "Move-Out Report",
};

function getReportTypeLabel(reportType: string | null | undefined): string {
  return REPORT_TYPE_LABELS[reportType ?? "check-in"] ?? "Move-In Report";
}

function formatAddress(p: Property): string {
  return [p.address_line1, p.address_line2, p.city, p.postcode].filter(Boolean).join(", ");
}

function formatMoveInDate(iso: string | null | undefined): string {
  if (!iso) return "Not specified";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPhotoTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ReportPublicClientProps = {
  reportId: string;
  property: Property;
  report: Report;
  rooms: Room[];
  photosWithUrls: PhotoWithUrl[];
};

/** Same UA check pattern as mobile “Take Photo” (camera) flows elsewhere in the app. */
const MOBILE_USER_AGENT_RE =
  /Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini|IEMobile/i;

function subscribeMobileUaNoop(_onStoreChange: () => void) {
  return () => {};
}

function getMobileUaSnapshot(): boolean {
  return typeof navigator !== "undefined" && MOBILE_USER_AGENT_RE.test(navigator.userAgent);
}

function getMobileUaServerSnapshot(): boolean {
  return false;
}

function useIsMobileUserAgent(): boolean {
  return useSyncExternalStore(
    subscribeMobileUaNoop,
    getMobileUaSnapshot,
    getMobileUaServerSnapshot
  );
}

const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";

type BlurImageProps = React.ComponentProps<typeof Image>;

function BlurImage(props: BlurImageProps) {
  const { className, onLoad, ...rest } = props;
  const [loaded, setLoaded] = useState(false);

  return (
    <Image
      {...rest}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      onLoad={(e) => {
        setLoaded(true);
        if (onLoad) onLoad(e);
      }}
      className={`${className ?? ""} transition-opacity duration-300 ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

export function ReportPublicClient({
  reportId,
  property,
  report,
  rooms,
  photosWithUrls,
}: ReportPublicClientProps) {
  const supabase = createClient();
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfReady, setPdfReady] = useState<Record<string, boolean>>({});
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [viewerRoomId, setViewerRoomId] = useState<string | null>(null);
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const isMobileUserAgent = useIsMobileUserAgent();
  const [expandedRoomIds, setExpandedRoomIds] = useState<Set<string>>(() => {
    const firstWithPhotos = rooms.find((r) =>
      photosWithUrls.some((p) => String(p.room_id) === String(r.id))
    );
    return new Set(firstWithPhotos ? [String(firstWithPhotos.id)] : []);
  });

  const toggleRoom = useCallback((roomId: string) => {
    setExpandedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }, []);

  const addressFull = formatAddress(property);

  const viewerRoomPhotos = viewerRoomId
    ? photosWithUrls.filter((p) => String(p.room_id) === viewerRoomId)
    : [];
  const currentPhoto =
    viewerRoomPhotos.length > 0 && viewerPhotoIndex !== null && viewerPhotoIndex >= 0 && viewerPhotoIndex < viewerRoomPhotos.length
      ? viewerRoomPhotos[viewerPhotoIndex]
      : null;

  useEffect(() => {
    const t = window.setTimeout(() => {
      window.dispatchEvent(new Event("report-data-ready"));
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerRoomId(null);
    setViewerPhotoIndex(null);
  }, []);

  const goPrev = useCallback(() => {
    if (viewerPhotoIndex === null || viewerRoomPhotos.length === 0) return;
    setViewerPhotoIndex((viewerPhotoIndex - 1 + viewerRoomPhotos.length) % viewerRoomPhotos.length);
  }, [viewerPhotoIndex, viewerRoomPhotos.length]);

  const goNext = useCallback(() => {
    if (viewerPhotoIndex === null || viewerRoomPhotos.length === 0) return;
    setViewerPhotoIndex((viewerPhotoIndex + 1) % viewerRoomPhotos.length);
  }, [viewerPhotoIndex, viewerRoomPhotos.length]);

  useEffect(() => {
    let t: ReturnType<typeof setInterval> | null = null;
    const check = async () => {
      const { data } = await supabase.from("reports").select("pdf_url").eq("id", reportId).single();
      if (data?.pdf_url) {
        setPdfReady((prev) => ({ ...prev, [reportId]: true }));
        if (t) clearInterval(t);
        return true;
      }
      return false;
    };
    check().then((ready) => {
      if (!ready) t = setInterval(() => check(), 3000);
    });
    return () => {
      if (t) clearInterval(t);
    };
  }, [reportId]);

  useEffect(() => {
    if (viewerRoomId === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [viewerRoomId]);

  useEffect(() => {
    if (viewerRoomId === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeViewer();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewerRoomId, closeViewer, goPrev, goNext]);
  const reportTypeLabel = getReportTypeLabel(report.report_type);

  async function handleDownloadPdf() {
    setPdfGenerating(true);
    setPdfError(null);
    try {
      const { data: reportRow, error: reportError } = await supabase
        .from("reports")
        .select("id, pdf_url")
        .eq("id", reportId)
        .single();

      if (!reportError && reportRow?.pdf_url) {
        const res = await fetch(reportRow.pdf_url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = reportRow.pdf_url.split("/").pop()?.split("?")[0] ?? "report.pdf";
        a.click();
        URL.revokeObjectURL(blobUrl);
        return;
      }

      const result = await generateReportPdf(reportId, property, report, rooms, photosWithUrls, true);

      if (result) {
        const { blob, filename } = result;
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(blobUrl);

        await uploadAndStorePdf(blob, reportId, filename, supabase);
      }
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Failed to generate PDF.");
    } finally {
      setPdfGenerating(false);
    }
  }

  function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({
        title: `${reportTypeLabel} — ${addressFull}`,
        url,
        text: `Property condition report: ${addressFull}`,
      }).catch(() => {
        navigator.clipboard?.writeText(url);
      });
    } else {
      navigator.clipboard?.writeText(url);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <Image
            src="/dg-logo-dark.png"
            alt="Deposit Guard"
            width={120}
            height={40}
            className="h-8 w-auto md:h-10"
          />
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-8 py-8 w-full flex-1">
      <main>
        {/* Report hero — no card, no border */}
        <section className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 md:gap-12 mb-16">
          <div className="space-y-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              {reportTypeLabel}
            </h1>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-gray-500 mb-0.5">Address</dt>
                <dd className="text-gray-900 font-medium">{addressFull}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-0.5">Move-in date</dt>
                <dd className="text-gray-900 font-medium">{formatMoveInDate(report.movein_date_local ?? property.tenancy_start_date)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-0.5">Report started</dt>
                <dd className="text-gray-900 font-medium">{formatTimestamp(report.created_at)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-0.5">Report completed</dt>
                <dd className="text-gray-900 font-medium">{formatTimestamp(report.completed_at)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-0.5">Report ID</dt>
                <dd className="text-gray-900 font-mono text-xs break-all text-gray-500">{reportId}</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-row gap-2 shrink-0 self-start md:pt-0">
            <button
              onClick={pdfReady[reportId] ? handleDownloadPdf : undefined}
              disabled={!pdfReady[reportId] || pdfGenerating}
              className={
                pdfReady[reportId]
                  ? "bg-white border border-[#008bff] text-[#008bff] rounded-md px-6 py-3 text-base font-medium flex items-center gap-2 hover:bg-blue-50 transition-colors"
                  : "bg-gray-400 opacity-50 cursor-not-allowed rounded-md px-6 py-3 text-base font-medium flex items-center gap-2 text-white"
              }
            >
              {!pdfReady[reportId] ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2" />
                  Preparing PDF…
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {pdfGenerating ? "Generating…" : "Download"}
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="bg-white border border-[#008bff] text-[#008bff] rounded-md px-6 py-3 text-base font-medium flex items-center gap-2 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </section>
        {pdfError && (
          <p className="mb-6 text-sm text-red-600">{pdfError}</p>
        )}

        {/* Room cards */}
        <div className="space-y-6">
          {rooms.map((room) => {
            const roomPhotos = photosWithUrls.filter((p) => String(p.room_id) === String(room.id));
            if (roomPhotos.length === 0) return null;

            const roomIdStr = String(room.id);
            const isExpanded = expandedRoomIds.has(roomIdStr);

            return (
              <article key={room.id} className="w-full rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleRoom(roomIdStr)}
                  className="flex items-center justify-between w-full px-4 py-3 text-white text-left cursor-pointer"
                  style={{ backgroundColor: "#008bff" }}
                  aria-expanded={isExpanded}
                >
                  <h2 className="text-base font-semibold text-white">
                    {room.display_name || room.room_type || "Room"}
                  </h2>
                  <span className="flex items-center gap-2 text-white">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/20">
                      {roomPhotos.length} {roomPhotos.length === 1 ? "photo" : "photos"}
                    </span>
                    <svg
                      className={`w-5 h-5 shrink-0 transition-transform duration-200 text-white ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      {room.notes && (
                        <p className="px-4 py-3 text-gray-600 italic text-sm border-b border-gray-100">
                          {room.notes}
                        </p>
                      )}
                      <div
                        className="grid grid-cols-2 md:grid-cols-4 gap-1 p-4 overflow-y-auto [container-type:inline-size] max-h-[calc(2*((100cqw-0.25rem)/2*5/4+4.5rem)+0.25rem)] md:max-h-[calc(2*((100cqw-0.5rem)/3*5/4+4.5rem)+0.25rem)]"
                      >
                        {roomPhotos.map((photo, index) => (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() => {
                              setViewerRoomId(String(room.id));
                              setViewerPhotoIndex(index);
                            }}
                            className="overflow-hidden text-left cursor-pointer block w-full"
                          >
                            <div className="aspect-[4/5] relative bg-gray-100 w-full">
                              <BlurImage
                                src={photo.signedUrl}
                                alt=""
                                fill
                                className="object-cover"
                                unoptimized
                                sizes="(max-width: 768px) 50vw, 33vw"
                              />
                            </div>
                            <div className="bg-gray-100 px-2 py-2 text-xs text-gray-600 overflow-hidden min-h-[3.5rem]">
                              <p className="font-semibold">{formatPhotoTimestamp(photo.taken_at)}</p>
                              {photo.note ? (
                                <p className="mt-0.5 text-gray-500 truncate overflow-hidden whitespace-nowrap">{photo.note}</p>
                              ) : (
                                <p className="mt-0.5 invisible" aria-hidden>&nbsp;</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 text-center text-sm text-gray-500">
        <p>© 2026 Deposit Guard. All rights reserved.</p>
        <p className="mt-1">
          <a
            href={LEGAL_TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700"
          >
            Terms of Service
          </a>
          <span className="mx-1">·</span>
          <a
            href={LEGAL_PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700"
          >
            Privacy Policy
          </a>
        </p>
      </footer>
      </div>

      {/* Photo lightbox modal */}
      {viewerRoomId !== null && currentPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
          onClick={closeViewer}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              touchStartXRef.current = e.touches[0].clientX;
            }
          }}
          onTouchEnd={(e) => {
            if (touchStartXRef.current == null || e.changedTouches.length === 0) {
              touchStartXRef.current = null;
              return;
            }
            const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
            touchStartXRef.current = null;
            if (Math.abs(deltaX) <= 50) return;
            if (deltaX < 0) {
              goNext();
            } else {
              goPrev();
            }
          }}
        >
          {!isMobileUserAgent && (
            <button
              type="button"
              onClick={closeViewer}
              aria-label="Close"
              className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/20 text-white border border-white text-xl flex items-center justify-center z-[2] hover:bg-white/30"
            >
              <span className="text-white">✕</span>
            </button>
          )}
          {!isMobileUserAgent &&
            viewerRoomPhotos.length > 1 &&
            viewerPhotoIndex !== null &&
            viewerPhotoIndex > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Previous photo"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 text-white border border-white flex items-center justify-center z-[2] hover:bg-white/30"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          {!isMobileUserAgent &&
            viewerRoomPhotos.length > 1 &&
            viewerPhotoIndex !== null &&
            viewerPhotoIndex < viewerRoomPhotos.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Next photo"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 text-white border border-white flex items-center justify-center z-[2] hover:bg-white/30"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
          <div
            className="flex flex-col items-center justify-center max-w-full max-h-full p-8 md:p-12 gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <BlurImage
              src={currentPhoto.signedUrl}
              alt=""
              width={1600}
              height={2000}
              className="max-w-full max-h-[70vh] object-contain"
              unoptimized
            />
            <div className="text-center text-white/90 text-sm px-4 max-w-2xl">
              <p className="font-semibold">{formatPhotoTimestamp(currentPhoto.taken_at)}</p>
              {currentPhoto.note && (
                <p className="mt-1 text-white/80">{currentPhoto.note}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

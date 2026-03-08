"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import PageWrapper from "@/components/PageWrapper";

const fadeScaleTransition = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.2, ease: "easeInOut" as const },
};

type Room = {
  id: string | number;
  display_name: string | null;
  room_type: string;
  custom_name: string | null;
  notes?: string | null;
  is_complete?: boolean | null;
};

type Photo = {
  id: string | number;
  storage_path: string;
  room_id: string | number;
  note?: string | null;
};

type ReportRoomClientProps = {
  userId: string;
  reportId: string;
  propertyId: string;
  room: Room;
  photosData: Photo[];
  isLocked: boolean;
};

const REPORT_WORKSPACE_HREF = (reportId: string) => `/reports/${reportId}`;

export function ReportRoomClient({
  userId,
  reportId,
  propertyId,
  room,
  photosData: initialPhotosData,
  isLocked,
}: ReportRoomClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>(initialPhotosData);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [roomNotes, setRoomNotes] = useState(room.notes ?? "");
  const [roomComplete, setRoomComplete] = useState(Boolean(room.is_complete));
  const [completeError, setCompleteError] = useState<string | null>(null);

  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState("");
  const [step, setStep] = useState<"idle" | "preview">("idle");
  const [photoSaving, setPhotoSaving] = useState(false);
  const [saveContinueLoading, setSaveContinueLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const roomName = room.display_name || room.custom_name || room.room_type || "Room";
  const reportHref = REPORT_WORKSPACE_HREF(reportId);

  useEffect(() => {
    const loadUrls = async () => {
      const map: Record<string, string> = {};
      for (const p of photos) {
        const { data } = await supabase.storage
          .from("photos")
          .createSignedUrl(p.storage_path, 60 * 60);
        if (data?.signedUrl) map[String(p.id)] = data.signedUrl;
      }
      setPhotoUrls(map);
    };
    loadUrls();
  }, [photos]);

  function openCamera() {
    if (isLocked) return;
    setError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isLocked) return;
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setPreviewFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    setPhotoNote("");
    setStep("preview");
    e.target.value = "";
  }

  function retake() {
    if (isLocked) return;
    setPreviewFile(null);
    setPreviewDataUrl(null);
    setStep("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function savePhoto() {
    if (isLocked) return;
    if (!previewFile) return;
    setPhotoSaving(true);
    setError(null);
    try {
      const timestamp = Date.now();
      const storagePath = `${userId}/${propertyId}/${room.id}/${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(storagePath, previewFile, { contentType: "image/jpeg", upsert: false });

      if (uploadError) {
        setError(uploadError.message || "Failed to upload photo.");
        setPhotoSaving(false);
        return;
      }

      const takenAt = new Date().toISOString();
      const { data: inserted, error: insertError } = await supabase
        .from("photos")
        .insert({
          room_id: room.id,
          property_id: propertyId,
          report_id: reportId,
          user_id: userId,
          storage_path: storagePath,
          note: photoNote.trim() || null,
          taken_at: takenAt,
        })
        .select("id, storage_path, room_id, note")
        .single();

      if (insertError) {
        setError(insertError.message || "Failed to save photo record.");
        setPhotoSaving(false);
        return;
      }

      setPhotos((prev) => [inserted as Photo, ...prev]);
      retake();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPhotoSaving(false);
    }
  }

  async function handleRoomCompleteChange(checked: boolean) {
    setCompleteError(null);
    if (checked && photos.length === 0) {
      setCompleteError("Room cannot be marked complete. At least one photo is required.");
      return;
    }
    setRoomComplete(checked);
    if (isLocked) return;
    try {
      await supabase
        .from("rooms")
        .update({ is_complete: checked })
        .eq("id", room.id)
        .eq("report_id", reportId)
        .eq("user_id", userId);
    } catch {
      setRoomComplete(!checked);
    }
  }

  async function handleSaveAndContinue() {
    if (isLocked) return;
    setSaveContinueLoading(true);
    setError(null);
    setCompleteError(null);
    try {
      const { error: updateError } = await supabase
        .from("rooms")
        .update({
          notes: roomNotes.slice(0, 1000).trim() || null,
        })
        .eq("id", room.id)
        .eq("report_id", reportId)
        .eq("user_id", userId);

      if (updateError) {
        setError(updateError.message || "Failed to save room.");
        setSaveContinueLoading(false);
        return;
      }
      router.push(reportHref);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaveContinueLoading(false);
    }
  }

  const viewerUrl = viewerIndex !== null && photos[viewerIndex] ? photoUrls[String(photos[viewerIndex].id)] : null;
  const canGoPrev = viewerIndex !== null && photos.length > 1;
  const canGoNext = viewerIndex !== null && photos.length > 1;

  const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => router.back()}
                className="tap-feedback-touch active:opacity-75 p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-[#0F172A] shrink-0 bg-transparent border-none cursor-pointer"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label="Back to report"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-[#0F172A] truncate" style={fontStyle}>
                {roomName}
              </h1>
            </div>
            {!isLocked && (
              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={saveContinueLoading}
                className="text-[#008bff] font-medium text-sm shrink-0 tap-feedback-touch active:opacity-75"
                style={{ ...fontStyle, WebkitTapHighlightColor: "transparent" }}
              >
                Done
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-5 max-w-[720px] mx-auto w-full overflow-y-auto flex flex-col gap-5">
          {isLocked && (
            <div className="py-2.5 px-3 rounded-lg bg-[#eff6ff] text-[#008bff] text-sm border border-[#008bff] flex items-center gap-2" style={fontStyle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#008bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>This report has been completed and is locked.</span>
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200" style={fontStyle}>
              {error}
            </div>
          )}

          {/* Photo grid - white card(s) */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
            {photos.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-6" style={fontStyle}>
                No photos yet. Tap &quot;📷 Take Photo&quot; below to capture.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setViewerIndex(index)}
                    className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden aspect-square w-full tap-feedback-touch active:opacity-90"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    {photoUrls[String(photo.id)] ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={photoUrls[String(photo.id)]}
                          alt=""
                          fill
                          sizes="(max-width: 720px) 33vw, 240px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs" style={fontStyle}>
                        Loading…
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

        {/* Full-size photo viewer modal */}
        {viewerIndex !== null && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
            onClick={() => setViewerIndex(null)}
          >
            <button
              type="button"
              onClick={() => setViewerIndex(null)}
              aria-label="Close"
              className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/20 text-white text-xl flex items-center justify-center z-[2] hover:bg-white/30"
            >
              ✕
            </button>
            {canGoPrev && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerIndex((viewerIndex - 1 + photos.length) % photos.length);
                }}
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center z-[2] hover:bg-white/30"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
            {canGoNext && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerIndex((viewerIndex + 1) % photos.length);
                }}
                aria-label="Next photo"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center z-[2] hover:bg-white/30"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}
            <div className="max-w-full max-h-full flex items-center justify-center p-8 md:p-12" onClick={(e) => e.stopPropagation()}>
              {viewerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={viewerUrl} alt="" className="max-w-full max-h-[85vh] object-contain" />
              ) : (
                <span className="text-gray-400">Loading…</span>
              )}
            </div>
            {photos[viewerIndex]?.note && (
              <p className="absolute bottom-8 left-4 right-4 text-center text-white/90 text-sm m-0" style={fontStyle}>
                {photos[viewerIndex].note}
              </p>
            )}
          </div>
        )}

        {/* Room Notes - white card */}
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
          <label htmlFor="room-notes" className="block text-sm font-medium text-[#414651] mb-1.5" style={fontStyle}>
            Room Notes
          </label>
          <textarea
            id="room-notes"
            value={roomNotes}
            onChange={(e) => setRoomNotes(e.target.value.slice(0, 1000))}
            placeholder="Add a note about this room, e.g. overall condition, any damage observed..."
            maxLength={1000}
            readOnly={isLocked}
            className={`w-full min-h-[120px] py-2.5 px-3 rounded-lg border text-[#0F172A] text-base outline-none focus:border-[#008bff] focus:ring-2 focus:ring-[#008bff]/20 resize-y ${isLocked ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-white"}`}
            style={fontStyle}
          />
          <p className="text-xs text-gray-500 mt-1" style={fontStyle}>
            {1000 - roomNotes.length} characters remaining
          </p>
        </div>

        {/* Room Complete checkbox - white card */}
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
          <label className={`flex items-center gap-3 ${isLocked ? "cursor-default" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={roomComplete}
              onChange={(e) => handleRoomCompleteChange(e.target.checked)}
              disabled={isLocked}
              className="w-4 h-4 rounded border-gray-300 text-[#008bff] focus:ring-[#008bff] focus:ring-offset-0"
            />
            <span className="text-[#0F172A] font-medium text-sm" style={fontStyle}>
              Mark room as complete
            </span>
          </label>
          {completeError && (
            <p className="mt-2 text-sm text-red-600" style={fontStyle}>
              {completeError}
            </p>
          )}
        </div>

        {/* Photo capture modal - shown when a photo has been captured but not yet saved */}
        <AnimatePresence>
          {step === "preview" && previewDataUrl && !isLocked && (
            <motion.div
              key="photo-capture-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
              onClick={(e) => e.target === e.currentTarget && retake()}
            >
              <motion.div
                {...fadeScaleTransition}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col rounded-2xl bg-white shadow-xl p-5"
              >
                <div className="rounded-xl overflow-hidden bg-gray-900 mb-4 flex-1 min-h-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewDataUrl}
                    alt="Preview"
                    className="block w-full h-auto max-h-[50vh] object-contain"
                  />
                </div>
                <input
                  type="text"
                  value={photoNote}
                  onChange={(e) => setPhotoNote(e.target.value.slice(0, 500))}
                  placeholder="Add a note about this photo (optional)"
                  maxLength={500}
                  className="w-full py-2.5 px-3 rounded-lg border border-gray-200 text-[#0F172A] text-base outline-none focus:border-[#008bff] focus:ring-2 focus:ring-[#008bff]/20 mb-1"
                  style={fontStyle}
                />
                <p className="text-xs text-gray-400 mb-4" style={fontStyle}>
                  {photoNote.length}/500
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={retake}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-[#0F172A] font-medium text-sm hover:bg-gray-50"
                    style={fontStyle}
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={savePhoto}
                    disabled={photoSaving}
                    className="flex-1 py-2.5 rounded-xl bg-[#008bff] text-white font-semibold text-sm hover:bg-[#0077e6] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ ...fontStyle, color: "#fff" }}
                  >
                    {photoSaving ? "Saving…" : "Save Photo"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom: stacked Take Photo + Save and Continue with small gap */}
        {!isLocked && (
          <div className="flex flex-col gap-2">
            {step === "idle" && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={openCamera}
                  disabled={photoSaving}
                  className="w-full py-3 rounded-xl border-2 border-[#1a1a86] text-[#1a1a86] bg-white font-medium text-base hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50 tap-feedback-touch"
                  style={{ ...fontStyle, WebkitTapHighlightColor: "transparent" }}
                >
                  📷 Take Photo
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleSaveAndContinue}
              disabled={saveContinueLoading}
              className="w-full py-3 rounded-xl bg-[#008bff] text-white font-semibold text-base hover:bg-[#0077e6] disabled:opacity-50 disabled:cursor-not-allowed tap-feedback-touch"
              style={{ ...fontStyle, color: "#fff", WebkitTapHighlightColor: "transparent" }}
            >
              {saveContinueLoading ? "Saving…" : "Save and Continue"}
            </button>
          </div>
        )}
        </main>
      </div>
    </PageWrapper>
  );
}

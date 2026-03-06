"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import PageWrapper from "@/components/PageWrapper";

type Property = {
  id: string | number;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
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
  property: Property;
  room: Room;
  photosData: Photo[];
  isLocked: boolean;
};

export function ReportRoomClient({
  userId,
  reportId,
  propertyId,
  property,
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
  const [step, setStep] = useState<"idle" | "preview">("idle");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveContinueLoading, setSaveContinueLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);
  const [deleteRoomLoading, setDeleteRoomLoading] = useState(false);
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState<number | null>(null);

  const roomName = room.display_name || room.custom_name || room.room_type || "Room";
  const reportWorkspaceHref = `/properties/${propertyId}/reports/${reportId}`;

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
        .eq("property_id", propertyId)
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
        .eq("property_id", propertyId)
        .eq("user_id", userId);

      if (updateError) {
        setError(updateError.message || "Failed to save room.");
        setSaveContinueLoading(false);
        return;
      }
      router.push(reportWorkspaceHref);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaveContinueLoading(false);
    }
  }

  async function confirmDeleteRoom() {
    if (isLocked) return;
    setDeleteRoomLoading(true);
    setError(null);
    try {
      for (const photo of photos) {
        await supabase.storage.from("photos").remove([photo.storage_path]);
        await supabase.from("photos").delete().eq("id", photo.id);
      }
      const { error: roomDeleteError } = await supabase
        .from("rooms")
        .delete()
        .eq("id", room.id)
        .eq("property_id", propertyId)
        .eq("user_id", userId);

      if (roomDeleteError) {
        setError(roomDeleteError.message || "Failed to delete room.");
        setDeleteRoomLoading(false);
        setShowDeleteRoomModal(false);
        return;
      }
      setShowDeleteRoomModal(false);
      router.push(reportWorkspaceHref);
    } catch {
      setError("Something went wrong. Please try again.");
      setDeleteRoomLoading(false);
      setShowDeleteRoomModal(false);
    }
  }

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
    setLoading(true);
    setError(null);
    try {
      const timestamp = Date.now();
      const storagePath = `${userId}/${property.id}/${room.id}/${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(storagePath, previewFile, { contentType: "image/jpeg", upsert: false });

      if (uploadError) {
        setError(uploadError.message || "Failed to upload photo.");
        setLoading(false);
        return;
      }

      const takenAt = new Date().toISOString();
      const { data: inserted, error: insertError } = await supabase
        .from("photos")
        .insert({
          room_id: room.id,
          property_id: property.id,
          report_id: reportId,
          user_id: userId,
          storage_path: storagePath,
          note: note.trim() || null,
          taken_at: takenAt,
        })
        .select("id, storage_path, room_id, note")
        .single();

      if (insertError) {
        setError(insertError.message || "Failed to save photo record.");
        setLoading(false);
        return;
      }

      setPhotos((prev) => [inserted as Photo, ...prev]);
      setCompleteError(null);
      retake();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function deletePhoto(photo: Photo) {
    if (isLocked) return;
    setLoading(true);
    setError(null);
    try {
      await supabase.storage.from("photos").remove([photo.storage_path]);
      const { error: deleteError } = await supabase.from("photos").delete().eq("id", photo.id);
      if (deleteError) {
        setError(deleteError.message || "Failed to delete photo.");
        setLoading(false);
        return;
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Link
                href={reportWorkspaceHref}
                className="tap-feedback-touch active:opacity-75 p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-[#0F172A] shrink-0"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label="Back to report"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-semibold text-[#0F172A] truncate" style={fontStyle}>
                {roomName}
              </h1>
            </div>
            {!isLocked && (
              <button
                type="button"
                onClick={() => setShowDeleteRoomModal(true)}
                className="p-1.5 rounded-lg hover:bg-red-50 shrink-0 tap-feedback-touch"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label="Delete room"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
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

          {/* Photo grid - white card */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
            {photos.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-6" style={fontStyle}>
                No photos yet. Tap &quot;Take Photo&quot; below to capture the room condition.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="rounded-xl bg-white border border-gray-200 shadow-sm p-2 flex flex-col gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => setViewerPhotoIndex(index)}
                      className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 block cursor-pointer"
                    >
                      {photoUrls[String(photo.id)] ? (
                        <Image
                          src={photoUrls[String(photo.id)]}
                          alt=""
                          fill
                          sizes="(max-width: 720px) 33vw, 240px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs" style={fontStyle}>
                          Loading…
                        </div>
                      )}
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePhoto(photo);
                          }}
                          disabled={loading}
                          className="absolute top-1 right-1.5 w-6 h-6 flex items-center justify-center bg-white/80 rounded text-red-600 text-xs font-medium hover:bg-white"
                          aria-label="Delete photo"
                        >
                          ✕
                        </button>
                      )}
                    </button>
                    {photo.note && (
                      <p className="text-xs text-gray-600 line-clamp-2" style={fontStyle}>
                        {photo.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

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

          {/* Room Complete - white card */}
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

          {step === "preview" && previewDataUrl && !isLocked && (
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
              <p className="text-[#0F172A] font-medium mb-3" style={fontStyle}>
                Preview
              </p>
              <div className="rounded-lg overflow-hidden mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewDataUrl} alt="Preview" className="block w-full max-h-[40vh] object-contain" />
              </div>
              <label className="block text-sm font-medium text-[#414651] mb-1.5" style={fontStyle}>
                Add an optional note
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="e.g. Scratch on wall near door, approximately 15cm long"
                maxLength={500}
                className="w-full py-2.5 px-3 rounded-lg border border-gray-200 text-[#0F172A] text-base outline-none focus:border-[#008bff] focus:ring-2 focus:ring-[#008bff]/20 mb-4"
                style={fontStyle}
              />
              <p className="text-xs text-gray-500 mb-4" style={fontStyle}>
                {note.length}/500
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={retake}
                  className="flex-1 py-3 rounded-lg border-2 border-[#1a1a86] text-[#1a1a86] bg-white font-medium text-base hover:bg-gray-50"
                  style={fontStyle}
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={savePhoto}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg bg-[#008bff] text-white font-semibold text-sm hover:bg-[#0077e6] disabled:opacity-50"
                  style={{ ...fontStyle, color: "#fff" }}
                >
                  {loading ? "Saving…" : "Save Photo"}
                </button>
              </div>
            </div>
          )}

          {/* Bottom: stacked Take Photo + Save and Continue */}
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
                    disabled={loading}
                    className="w-full py-3 rounded-lg border-2 border-[#1a1a86] text-[#1a1a86] bg-white font-medium text-base hover:bg-gray-50 flex items-center justify-center gap-2 tap-feedback-touch disabled:opacity-50"
                    style={{ ...fontStyle, WebkitTapHighlightColor: "transparent" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1a86" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                    Take Photo
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={saveContinueLoading}
                className="w-full py-3 rounded-lg bg-[#008bff] text-white font-semibold text-base hover:bg-[#0077e6] tap-feedback-touch disabled:opacity-50 disabled:cursor-wait"
                style={{ ...fontStyle, color: "#fff", WebkitTapHighlightColor: "transparent" }}
              >
                {saveContinueLoading ? "Saving…" : "Save and Continue"}
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Photo viewer modal - same overlay/container pattern as delete modal */}
      <AnimatePresence>
        {viewerPhotoIndex !== null && photos[viewerPhotoIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto"
            onClick={() => setViewerPhotoIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl bg-white p-6 shadow-xl max-w-4xl w-full my-8 text-left"
            >
              <div className="relative flex flex-col items-center">
                <div className="inline-flex max-w-full flex-col items-stretch">
                  <div className="relative flex justify-center overflow-hidden" style={{ maxHeight: "70vh" }}>
                    {photoUrls[String(photos[viewerPhotoIndex].id)] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrls[String(photos[viewerPhotoIndex].id)]}
                        alt=""
                        className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
                      />
                    ) : (
                      <span className="py-12 text-gray-500" style={fontStyle}>Loading…</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setViewerPhotoIndex(null)}
                      className="absolute top-3 right-3 p-2 rounded-lg border border-gray-200 bg-white text-[#0F172A] hover:bg-gray-50 tap-feedback-touch"
                      style={fontStyle}
                      aria-label="Close"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {photos[viewerPhotoIndex].note && (
                    <div className="w-full bg-gray-50 rounded-xl px-3 py-2 mt-3 flex items-start gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-500 mt-0.5" aria-hidden>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <p className="text-sm text-gray-700 min-w-0 flex-1" style={fontStyle}>
                        {photos[viewerPhotoIndex].note}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-3 mt-4 w-full max-w-sm mx-auto">
                  {viewerPhotoIndex > 0 ? (
                    <button
                      type="button"
                      onClick={() => setViewerPhotoIndex(viewerPhotoIndex - 1)}
                      className="flex-1 min-w-0 py-2.5 px-4 rounded-lg border border-gray-200 bg-white text-[#008bff] font-medium text-sm hover:bg-gray-50 tap-feedback-touch"
                      style={fontStyle}
                    >
                      ← Previous
                    </button>
                  ) : null}
                  {viewerPhotoIndex < photos.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setViewerPhotoIndex(viewerPhotoIndex + 1)}
                      className="flex-1 min-w-0 py-2.5 px-4 rounded-lg border border-gray-200 bg-white text-[#008bff] font-medium text-sm hover:bg-gray-50 tap-feedback-touch"
                      style={fontStyle}
                    >
                      Next →
                    </button>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Room confirmation modal */}
      <AnimatePresence>
        {showDeleteRoomModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !deleteRoomLoading && setShowDeleteRoomModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl bg-white p-6 shadow-xl max-w-sm w-full text-left"
            >
              <h3 className="text-lg font-semibold text-[#0F172A] mb-1" style={fontStyle}>
                Delete Room
              </h3>
              <p className="text-sm text-gray-500 mb-6" style={fontStyle}>
                Are you sure you want to delete this room? All photos in this room will also be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => !deleteRoomLoading && setShowDeleteRoomModal(false)}
                  disabled={deleteRoomLoading}
                  className="flex-[1] py-2.5 rounded-lg font-medium text-sm bg-[#008bff] text-white hover:bg-[#0077e6] disabled:opacity-50"
                  style={{ ...fontStyle, color: "#ffffff" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteRoom}
                  disabled={deleteRoomLoading}
                  className="flex-[2] py-2.5 rounded-lg font-medium text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  style={{ ...fontStyle, color: "#ffffff" }}
                >
                  {deleteRoomLoading ? "Deleting…" : "Yes, Delete Room"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation - no tab active */}
      <nav className="fixed bottom-0 left-0 right-0 w-full lg:max-w-[1080px] lg:left-1/2 lg:-translate-x-1/2 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
        <div className="flex justify-around max-w-[720px] mx-auto">
          <Link href="/dashboard" className="tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 text-gray-400 hover:text-[#008bff]" style={{ WebkitTapHighlightColor: "transparent" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="text-xs font-medium" style={fontStyle}>Home</span>
          </Link>
          <Link href="/properties" className="tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 text-gray-400 hover:text-[#008bff]" style={{ WebkitTapHighlightColor: "transparent" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-xs font-medium" style={fontStyle}>Properties</span>
          </Link>
          <Link href="/settings" className="tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 text-gray-400 hover:text-[#008bff]" style={{ WebkitTapHighlightColor: "transparent" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span className="text-xs font-medium" style={fontStyle}>Settings</span>
          </Link>
          <span className="flex flex-col items-center gap-1 py-1 text-gray-400 cursor-default">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="text-xs font-medium" style={fontStyle}>Help</span>
          </span>
        </div>
      </nav>
    </PageWrapper>
  );
}

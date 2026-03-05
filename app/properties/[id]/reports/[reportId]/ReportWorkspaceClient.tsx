"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import * as exifr from "exifr";
import { createClient } from "@/lib/supabase/client";
import PageWrapper from "@/components/PageWrapper";

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
};

const ROOM_TYPES = [
  "Living Room",
  "Kitchen",
  "Bedroom",
  "Bathroom",
  "Ensuite",
  "Hallway",
  "Garden",
  "Balcony",
  "Storage",
  "Utility",
  "Custom",
] as const;

type Photo = {
  id: string | number;
  storage_path: string;
  room_id: string | number;
  note?: string | null;
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  "check-in": "Check-In Report",
  interim: "Interim Report",
  "check-out": "Check-Out Report",
};

function getReportTypeLabel(reportType: string | null | undefined): string {
  return REPORT_TYPE_LABELS[reportType ?? "check-in"] ?? "Check-In Report";
}

type ReportWorkspaceClientProps = {
  userId: string;
  reportId: string;
  property: Property;
  reportCompleted: boolean;
  reportType?: string | null;
  completedAt?: string | null;
  checkoutAtLocal?: string | null;
  moveinDateLocal?: string | null;
  rooms: Room[];
  photosData: Photo[];
  /** When "reports", room cards link to /reports/[reportId]/rooms/[roomId]. Otherwise /properties/[id]/reports/[reportId]/rooms/[roomId]. */
  roomLinkBase?: "reports";
};

function formatAddress(p: Property): string {
  const parts = [
    p.address_line1,
    p.address_line2,
    p.city,
    p.postcode,
  ].filter(Boolean);
  return parts.join(", ");
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

function formatReportCompleted(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const day = d.getUTCDate();
  const month = d.toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
  const year = d.getUTCFullYear();
  const hour = d.getUTCHours();
  const min = d.getUTCMinutes();
  const hourStr = String(hour).padStart(2, "0");
  const minStr = String(min).padStart(2, "0");
  return `${day} ${month} ${year}, ${hourStr}:${minStr} GMT`;
}

export function ReportWorkspaceClient({
  userId,
  reportId,
  property,
  reportCompleted: initialReportCompleted,
  reportType,
  completedAt,
  checkoutAtLocal,
  moveinDateLocal,
  rooms: initialRooms,
  photosData,
  roomLinkBase,
}: ReportWorkspaceClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [checkoutDateInput, setCheckoutDateInput] = useState("");
  const [checkoutDateSaving, setCheckoutDateSaving] = useState(false);
  const [checkoutDateError, setCheckoutDateError] = useState<string | null>(null);

  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [propertyPhotos, setPropertyPhotos] = useState<Record<string, Photo[]>>(() => {
    const byRoom: Record<string, Photo[]> = {};
    for (const r of initialRooms) byRoom[String(r.id)] = [];
    for (const p of photosData) {
      const rid = String(p.room_id);
      if (!byRoom[rid]) byRoom[rid] = [];
      byRoom[rid].push(p);
    }
    return byRoom;
  });
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [addRoomSelectedType, setAddRoomSelectedType] = useState<string | null>(null);
  const [addRoomCustomName, setAddRoomCustomName] = useState('');
  const [reportCompleted, setReportCompleted] = useState(initialReportCompleted);
  const isLocked = reportCompleted;

  const completedCount = rooms.filter(
    (r) => (propertyPhotos[String(r.id)] ?? []).length > 0
  ).length;
  const effectiveCompletedCount = isLocked ? rooms.length : completedCount;
  const allRoomsComplete = () => {
    if (rooms.length === 0) return false;
    return rooms.every((r) => (propertyPhotos[String(r.id)] ?? []).length > 0);
  };

  const handleAddRoomClick = () => {
    setAddRoomModalOpen(true);
    setAddRoomSelectedType(null);
    setAddRoomCustomName("");
  };

  const handleConfirmAddRoom = async () => {
    if (!property.id) return;
    const roomType = addRoomSelectedType;
    if (!roomType) return;
    const isCustom = roomType === "Custom";
    const baseName = isCustom ? addRoomCustomName.trim() || "Custom" : roomType;
    if (isCustom && !addRoomCustomName.trim()) return;

    const sameTypeRooms = rooms.filter((r) =>
      r.room_type === "Custom" ? (r.custom_name || "").trim() === baseName : r.room_type === roomType
    );
    const displayName = `${baseName} ${sameTypeRooms.length + 1}`;

    setDetailsError(null);
    try {
      const { data: newRoom, error } = await supabase
        .from("rooms")
        .insert({
          property_id: property.id,
          user_id: userId,
          room_type: roomType,
          custom_name: isCustom ? addRoomCustomName.trim() : null,
          display_name: displayName,
        })
        .select("id, display_name, room_type, custom_name")
        .single();

      if (error) {
        setDetailsError(error.message ?? "Failed to add room.");
        return;
      }
      setRooms((prev) => [...prev, newRoom as Room]);
      setPropertyPhotos((prev) => ({ ...prev, [String(newRoom.id)]: [] }));
      setAddRoomModalOpen(false);
      setAddRoomSelectedType(null);
      setAddRoomCustomName("");
    } catch {
      setDetailsError("Something went wrong.");
    }
  };

  async function generateReport() {
    if (!allRoomsComplete()) {
      setDetailsError("Add at least one photo to each room before generating your report.");
      return;
    }
    const totalPhotos = Object.values(propertyPhotos).flat().length;
    if (totalPhotos === 0) return;
    setReportGenerating(true);
    setDetailsError(null);
    try {
      const { data: photos } = await supabase
        .from("photos")
        .select("id, room_id, storage_path, note, taken_at")
        .eq("property_id", property.id)
        .order("taken_at", { ascending: true });

      if (!photos?.length) {
        setDetailsError("No photos found to include in the report.");
        setReportGenerating(false);
        return;
      }

      type PhotoRow = { id: string; room_id: string; storage_path: string; note: string | null; taken_at: string | null };
      const photosWithData: { photo: PhotoRow; dataUrl: string; width: number; height: number }[] = [];
      for (const photo of photos as PhotoRow[]) {
        const { data: signed } = await supabase.storage
          .from("photos")
          .createSignedUrl(photo.storage_path, 3600);
        if (!signed?.signedUrl) continue;

        const res = await fetch(signed.signedUrl);
        const blob = await res.blob();
        let orientation = 1;
        try {
          const exifData: { Orientation?: number } = await exifr.parse(blob, { pick: ["Orientation"] });
          if (exifData?.Orientation) orientation = exifData.Orientation;
        } catch {
          /* ignore */
        }

        const objectUrl = URL.createObjectURL(blob);
        const img = new window.Image();
        img.src = objectUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
        });

        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          continue;
        }

        switch (orientation) {
          case 3:
            canvas.width = srcW;
            canvas.height = srcH;
            ctx.translate(canvas.width, canvas.height);
            ctx.rotate(Math.PI);
            break;
          case 6:
            canvas.width = srcH;
            canvas.height = srcW;
            ctx.translate(canvas.width, 0);
            ctx.rotate(Math.PI / 2);
            break;
          case 8:
            canvas.width = srcH;
            canvas.height = srcW;
            ctx.translate(0, canvas.height);
            ctx.rotate(-Math.PI / 2);
            break;
          default:
            canvas.width = srcW;
            canvas.height = srcH;
        }
        ctx.drawImage(img, 0, 0, srcW, srcH);
        URL.revokeObjectURL(objectUrl);

        photosWithData.push({
          photo,
          dataUrl: canvas.toDataURL("image/jpeg", 0.9),
          width: canvas.width,
          height: canvas.height,
        });
      }

      async function loadAsset(path: string): Promise<string | null> {
        try {
          const res = await fetch(path);
          if (!res.ok) return null;
          const blob = await res.blob();
          return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = reject;
            r.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      }

      const [coverDataUrl, logoDataUrl] = await Promise.all([
        loadAsset("/Report_Cover.png"),
        loadAsset("/dg-logo-dark.png"),
      ]);

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const footerY = pageH - 12;

      function addHeader() {
        const headerTop = margin;
        const logoWidth = 38;
        const logoHeight = logoWidth * 0.3;
        doc.setFontSize(11);
        if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", margin, headerTop, logoWidth, logoHeight);
        doc.setTextColor(55, 65, 81);
        doc.text("Property Condition Report", pageW / 2, headerTop + 7, { align: "center" });
        if (property.address_line1) doc.text(property.address_line1, pageW - margin, headerTop + 7, { align: "right" });
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        const lineY = headerTop + 16;
        doc.line(margin, lineY, pageW - margin, lineY);
        return lineY;
      }

      function addFooter(pageNum: number) {
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text("Report ID", margin, footerY - 4);
        doc.setFontSize(9);
        doc.setTextColor(17, 24, 39);
        doc.text(String(property.id), margin, footerY);
        doc.setTextColor(55, 65, 81);
        doc.text(`Page ${pageNum}`, pageW - margin, footerY, { align: "right" });
      }

      const reportDate = new Date();
      if (coverDataUrl) doc.addImage(coverDataUrl, "PNG", 0, 0, pageW, pageH);

      doc.addPage();
      addHeader();
      let y = margin + 28;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text("Property Condition Report", margin, y);
      y += 10;

      const addressFull = [property.address_line1, property.address_line2, property.city, property.postcode]
        .filter(Boolean)
        .join(", ");
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Address", margin, y);
      doc.setTextColor(15, 23, 42);
      doc.text(addressFull || "—", margin + 38, y);
      y += 14;
      doc.setTextColor(100, 116, 139);
      doc.text("Property Type", margin, y);
      doc.setTextColor(15, 23, 42);
      doc.text(property.property_type ?? "—", margin + 38, y);
      y += 14;
      doc.setTextColor(100, 116, 139);
      doc.text("Total Rooms", margin, y);
      doc.setTextColor(15, 23, 42);
      doc.text(String(rooms.length), margin + 38, y);
      y += 14;
      doc.setTextColor(100, 116, 139);
      doc.text("Total Photos", margin, y);
      doc.setTextColor(15, 23, 42);
      doc.text(String(photos.length), margin + 38, y);
      addFooter(2);

      const imgMaxW = 85;
      const imgMaxH = 70;
      rooms.forEach((room) => {
        const roomPhotos = photosWithData.filter((p) => String(p.photo.room_id) === String(room.id));
        if (roomPhotos.length === 0) return;

        doc.addPage();
        addHeader();
        let gridY = margin + 40;
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text(room.display_name || room.room_type || "Room", margin, gridY);
        gridY += 12;

        const cols = 3;
        roomPhotos.forEach((item, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const x = margin + col * (imgMaxW + 4);
          const imgY = gridY + row * (imgMaxH + 4);
          const scale = Math.min(imgMaxW / item.width, imgMaxH / item.height, 1);
          const w = item.width * scale;
          const h = item.height * scale;
          doc.addImage(item.dataUrl, "JPEG", x, imgY, w, h);
        });
        addFooter(doc.getNumberOfPages());
      });

      const timestamp = Date.now();
      const storagePath = `${userId}/${property.id}/${timestamp}.pdf`;
      const pdfBlob = doc.output("blob");

      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(storagePath, pdfBlob, { contentType: "application/pdf" });
      if (uploadError) throw new Error(uploadError.message ?? "Failed to upload report.");

      const { error: updateError } = await supabase
        .from("reports")
        .update({
          storage_path: storagePath,
          status: "completed",
        })
        .eq("id", reportId)
        .eq("user_id", userId);

      if (updateError) throw new Error(updateError.message ?? "Failed to update report.");

      setReportCompleted(true);

      const safeAddress = (property.address_line1 || "Property")
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 50);
      const dateForFile = reportDate.toISOString().slice(0, 10);
      doc.save(`DepositGuard_Report_${safeAddress}_${dateForFile}.pdf`);

      router.refresh();
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Failed to generate report.");
    } finally {
      setReportGenerating(false);
    }
  }

  async function handleSaveCheckoutDate() {
    if (!checkoutDateInput.trim()) {
      setCheckoutDateError("Please select a check-out date.");
      return;
    }
    setCheckoutDateError(null);
    setCheckoutDateSaving(true);
    try {
      const date = new Date(checkoutDateInput + "T12:00:00");
      const checkoutDateLocal = date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const { error: updateError } = await supabase
        .from("reports")
        .update({ checkout_date_local: checkoutDateLocal })
        .eq("id", reportId)
        .eq("user_id", userId);
      if (updateError) throw new Error(updateError.message);
      router.refresh();
    } catch (err) {
      setCheckoutDateError(err instanceof Error ? err.message : "Failed to save date. Please try again.");
    } finally {
      setCheckoutDateSaving(false);
    }
  }

  async function downloadReport() {
    setReportGenerating(true);
    setDetailsError(null);
    try {
      const { data: report, error: reportError } = await supabase
        .from("reports")
        .select("storage_path")
        .eq("id", reportId)
        .eq("user_id", userId)
        .single();

      if (reportError || !report?.storage_path) {
        setDetailsError("No report found to download.");
        return;
      }

      const { data, error: urlError } = await supabase.storage
        .from("reports")
        .createSignedUrl(report.storage_path, 3600);
      if (urlError || !data?.signedUrl) {
        setDetailsError(urlError?.message ?? "Failed to generate download link.");
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      setDetailsError("Failed to download report.");
    } finally {
      setReportGenerating(false);
    }
  }

  const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

  return (
    <PageWrapper>
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col pb-24">
      {addRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-[400px] w-full p-6 my-auto">
            <p className="text-[#0F172A] font-medium mb-3" style={fontStyle}>
              Name the room
            </p>
            <div className="mb-4">
              <label htmlFor="add-room-type" className="block text-sm font-medium text-[#414651] mb-1.5" style={fontStyle}>
                Room type
              </label>
              <select
                id="add-room-type"
                value={addRoomSelectedType ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setAddRoomSelectedType(v || null);
                  if (v !== "Custom") setAddRoomCustomName("");
                }}
                className="w-full py-2.5 px-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] text-base outline-none focus:border-[#008bff] focus:ring-2 focus:ring-[#008bff]/20"
                style={fontStyle}
              >
                <option value="">Select room type</option>
                {ROOM_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            {addRoomSelectedType === "Custom" && (
              <div className="mb-4">
                <label htmlFor="add-room-custom" className="block text-sm font-medium text-[#414651] mb-1.5" style={fontStyle}>
                  Custom room name
                </label>
                <input
                  id="add-room-custom"
                  type="text"
                  value={addRoomCustomName}
                  onChange={(e) => setAddRoomCustomName(e.target.value)}
                  placeholder="e.g. Study, Attic"
                  className="w-full py-2.5 px-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] text-base outline-none focus:border-[#008bff] focus:ring-2 focus:ring-[#008bff]/20"
                  style={fontStyle}
                />
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setAddRoomModalOpen(false);
                  setAddRoomSelectedType(null);
                  setAddRoomCustomName("");
                }}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 bg-white text-[#0F172A] font-medium text-sm"
                style={fontStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddRoom}
                disabled={!addRoomSelectedType || (addRoomSelectedType === "Custom" && !addRoomCustomName.trim())}
                className="flex-1 py-2.5 rounded-lg bg-[#008bff] text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ ...fontStyle, color: "#ffffff" }}
              >
                Add Room
              </button>
            </div>
          </div>
        </div>
      )}

      {reportType === "check-out" && !checkoutAtLocal ? (
        <>
          <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                href={`/properties/${property.id}`}
                className="tap-feedback-touch active:opacity-75 p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-[#0F172A]"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label="Back to property"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-semibold text-[#0F172A]" style={fontStyle}>
                {getReportTypeLabel(reportType)}
              </h1>
            </div>
          </header>
          <main className="flex-1 px-4 py-5 max-w-[720px] mx-auto w-full overflow-y-auto">
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6">
              <p className="text-[#0F172A] font-medium mb-2" style={fontStyle}>
                What is your check-out date?
              </p>
              {checkoutDateError && (
                <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                  {checkoutDateError}
                </div>
              )}
              <input
                type="date"
                value={checkoutDateInput}
                onChange={(e) => setCheckoutDateInput(e.target.value)}
                className="w-full py-2.5 px-3 rounded-lg border border-gray-200 text-[#0F172A] text-base outline-none focus:border-[#008bff] focus:ring-2 focus:ring-[#008bff]/20 mb-4"
                style={fontStyle}
              />
              <button
                type="button"
                onClick={handleSaveCheckoutDate}
                disabled={checkoutDateSaving}
                className="w-full py-3 rounded-lg font-medium text-base bg-[#008bff] text-white hover:bg-[#0077e6] disabled:opacity-50"
                style={{ ...fontStyle, color: "#ffffff" }}
              >
                {checkoutDateSaving ? "Saving…" : "Continue"}
              </button>
            </div>
          </main>
        </>
      ) : (
        <>
          <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                href={`/properties/${property.id}`}
                className="tap-feedback-touch active:opacity-75 p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-[#0F172A]"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label="Back to property"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-semibold text-[#0F172A]" style={fontStyle}>
                {getReportTypeLabel(reportType)}
              </h1>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 max-w-[720px] mx-auto w-full overflow-y-auto">
        {isLocked && (
          <div className="mb-4 py-2.5 px-3 rounded-lg bg-[#eff6ff] text-[#008bff] text-sm border border-[#008bff] flex items-center gap-2" style={fontStyle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#008bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>This report has been completed and is locked.</span>
          </div>
        )}
        {detailsError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            {detailsError}
          </div>
        )}
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
            {reportType === "check-in" && (
              <>
                {moveinDateLocal && (
                  <div className="flex gap-3">
                    <span className="text-lg shrink-0" aria-hidden>📅</span>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5" style={fontStyle}>
                        Move-In Date
                      </p>
                      <p className="text-[#0F172A] font-medium" style={fontStyle}>
                        {moveinDateLocal}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
            {reportType === "check-out" && checkoutAtLocal && (
              <div className="flex gap-3">
                <span className="text-lg shrink-0" aria-hidden>📅</span>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5" style={fontStyle}>
                    Check-Out Date
                  </p>
                  <p className="text-[#0F172A] font-medium" style={fontStyle}>
                    {checkoutAtLocal}
                  </p>
                </div>
              </div>
            )}
            {initialReportCompleted && completedAt && (
              <div className="flex gap-3">
                <span className="text-lg shrink-0" aria-hidden>📄</span>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5" style={fontStyle}>
                    Report Completed
                  </p>
                  <p className="text-[#0F172A] font-medium" style={fontStyle}>
                    {formatReportCompleted(completedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[#414651] font-medium text-sm" style={fontStyle}>
              Progress
            </p>
            <p className="text-[#6B7280] text-sm" style={fontStyle}>
              {effectiveCompletedCount} of {rooms.length} rooms completed
            </p>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#008bff] rounded-full transition-all duration-300"
              style={{
                width: rooms.length ? `${(effectiveCompletedCount / rooms.length) * 100}%` : "0%",
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          {rooms.map((room) => {
            const rid = String(room.id);
            const photos = propertyPhotos[rid] ?? [];
            const photoCount = photos.length;
            const isComplete = isLocked || photoCount > 0;
            const roomName = room.display_name || room.room_type || "Room";

            const roomHref =
              roomLinkBase === "reports"
                ? `/reports/${reportId}/rooms/${rid}`
                : `/properties/${property.id}/reports/${reportId}/rooms/${rid}`;
            return (
              <Link
                key={room.id}
                href={roomHref}
                className="rounded-xl border border-gray-200 p-4 bg-white flex items-center gap-3 active:opacity-75 transition-opacity tap-feedback-touch"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <span className="shrink-0 w-6 h-6 flex items-center justify-center" aria-hidden>
                  {isComplete ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <span className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0F172A] text-base" style={fontStyle}>
                    {roomName}
                  </p>
                  <p className="text-sm text-[#6B7280]" style={fontStyle}>
                    {photoCount === 0 ? "0 photos" : photoCount === 1 ? "1 photo" : `${photoCount} photos`}
                  </p>
                </div>
                <span className="shrink-0 text-gray-400" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </Link>
            );
          })}
        </div>

        {!isLocked && (
          <button
            type="button"
            onClick={handleAddRoomClick}
            className="w-full py-3 rounded-xl border-2 border-[#1a1a86] text-[#1a1a86] bg-white font-medium text-base hover:bg-gray-50 flex items-center justify-center gap-2 mb-6"
            style={fontStyle}
          >
            <span className="text-xl leading-none">＋</span>
            Add Room
          </button>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 w-full lg:max-w-[1080px] lg:left-1/2 lg:-translate-x-1/2 bg-white border-t border-gray-200 p-4 safe-area-pb">
        <div className="max-w-[720px] mx-auto">
          {isLocked ? (
            <button
              type="button"
              onClick={downloadReport}
              disabled={reportGenerating}
              className="w-full py-3 rounded-lg font-medium text-base bg-[#008bff] text-white hover:bg-[#0077e6] disabled:opacity-50"
              style={{ ...fontStyle, color: "#ffffff" }}
            >
              {reportGenerating ? "Downloading…" : "Download Report"}
            </button>
          ) : (
            <button
              type="button"
              onClick={generateReport}
              disabled={reportGenerating || !allRoomsComplete()}
              className={`w-full py-3 rounded-lg font-medium text-base transition-colors ${
                reportGenerating || !allRoomsComplete()
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-[#008bff] text-white hover:bg-[#0077e6]"
              }`}
              style={{ ...fontStyle, color: reportGenerating || !allRoomsComplete() ? undefined : "#ffffff" }}
            >
              {reportGenerating ? "Generating…" : "Generate Report"}
            </button>
          )}
        </div>
      </div>
        </>
      )}
    </div>
    </PageWrapper>
  );
}

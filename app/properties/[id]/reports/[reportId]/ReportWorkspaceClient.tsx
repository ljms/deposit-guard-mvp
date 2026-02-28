"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  is_locked?: boolean | null;
  move_in_date?: string | null;
};

type Room = {
  id: string | number;
  display_name: string | null;
  room_type: string;
  custom_name: string | null;
};

type Photo = {
  id: string | number;
  storage_path: string;
  room_id: string | number;
};

type ReportWorkspaceClientProps = {
  userId: string;
  reportId: string;
  property: Property;
  rooms: Room[];
  photosData: Photo[];
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

export function ReportWorkspaceClient({
  userId,
  reportId,
  property,
  rooms: initialRooms,
  photosData,
}: ReportWorkspaceClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [roomComplete, setRoomComplete] = useState<Record<string, boolean>>({});
  const [roomCompleteError, setRoomCompleteError] = useState<string | null>(null);
  const [photoUploadingFor, setPhotoUploadingFor] = useState<string | null>(null);
  const [activeCameraRoomId, setActiveCameraRoomId] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);

  useEffect(() => {
    const loadUrls = async () => {
      const urlMap: Record<string, string> = {};
      for (const p of photosData) {
        const { data } = await supabase.storage
          .from("photos")
          .createSignedUrl(p.storage_path, 3600);
        if (data?.signedUrl) urlMap[String(p.id)] = data.signedUrl;
      }
      setPhotoUrls(urlMap);
    };
    loadUrls();
  }, [photosData, supabase.storage]);

  const completedCount = rooms.filter((r) => roomComplete[String(r.id)]).length;
  const allRoomsComplete = () => {
    if (rooms.length === 0) return false;
    return rooms.every((r) => roomComplete[String(r.id)]);
  };

  const openCameraForRoom = (roomId: string) => {
    setRoomCompleteError(null);
    setActiveCameraRoomId(roomId);
    fileInputRef.current?.click();
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const roomId = activeCameraRoomId;
    if (!roomId || !property.id) return;
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      setActiveCameraRoomId(null);
      e.target.value = "";
      return;
    }

    setPhotoUploadingFor(roomId);
    setDetailsError(null);
    try {
      const timestamp = Date.now();
      const storagePath = `${userId}/${property.id}/${roomId}/${timestamp}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from("photos")
        .upload(storagePath, file, { contentType: "image/jpeg", upsert: false });

      if (uploadErr) {
        setDetailsError(uploadErr.message ?? "Failed to upload photo.");
        setPhotoUploadingFor(null);
        setActiveCameraRoomId(null);
        e.target.value = "";
        return;
      }

      const takenAt = new Date().toISOString();
      const { data: inserted, error: insertErr } = await supabase
        .from("photos")
        .insert({
          room_id: roomId,
          property_id: property.id,
          user_id: userId,
          storage_path: storagePath,
          note: null,
          taken_at: takenAt,
        })
        .select("id, storage_path, room_id")
        .single();

      if (insertErr) {
        setDetailsError(insertErr.message ?? "Failed to save photo.");
        setPhotoUploadingFor(null);
        setActiveCameraRoomId(null);
        e.target.value = "";
        return;
      }

      const photo = inserted as Photo;
      setPropertyPhotos((prev) => ({
        ...prev,
        [roomId]: [photo, ...(prev[roomId] ?? [])],
      }));

      const { data: urlData } = await supabase.storage
        .from("photos")
        .createSignedUrl(storagePath, 3600);
      if (urlData?.signedUrl) {
        setPhotoUrls((prev) => ({ ...prev, [String(photo.id)]: urlData.signedUrl }));
      }
    } catch {
      setDetailsError("Something went wrong.");
    } finally {
      setPhotoUploadingFor(null);
      setActiveCameraRoomId(null);
      e.target.value = "";
    }
  };

  const handleRoomCompleteChange = (roomId: string, checked: boolean) => {
    setRoomCompleteError(null);
    const photos = propertyPhotos[roomId] ?? [];
    if (checked && photos.length === 0) {
      setRoomCompleteError("Room cannot be marked complete. At least one photo is required.");
      return;
    }
    setRoomComplete((prev) => ({ ...prev, [roomId]: checked }));
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!property.id) return;
    if (!window.confirm("Delete this room and all its photos?")) return;
    setDetailsError(null);
    try {
      const photos = propertyPhotos[roomId] ?? [];
      for (const p of photos) {
        await supabase.storage.from("photos").remove([p.storage_path]);
      }
      await supabase.from("photos").delete().eq("room_id", roomId);
      const { error } = await supabase.from("rooms").delete().eq("id", roomId);
      if (error) {
        setDetailsError(error.message ?? "Failed to delete room.");
        return;
      }
      setRooms((prev) => prev.filter((r) => String(r.id) !== roomId));
      setPropertyPhotos((prev) => {
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
      setRoomComplete((prev) => {
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
    } catch {
      setDetailsError("Something went wrong.");
    }
  };

  const handleAddRoom = async () => {
    if (!property.id) return;
    setDetailsError(null);
    try {
      const { data: newRoom, error } = await supabase
        .from("rooms")
        .insert({
          property_id: property.id,
          user_id: userId,
          room_type: "Room",
          custom_name: null,
          display_name: "Room",
        })
        .select("id, display_name, room_type, custom_name")
        .single();

      if (error) {
        setDetailsError(error.message ?? "Failed to add room.");
        return;
      }
      setRooms((prev) => [...prev, newRoom as Room]);
      setPropertyPhotos((prev) => ({ ...prev, [String(newRoom.id)]: [] }));
    } catch {
      setDetailsError("Something went wrong.");
    }
  };

  async function generateReport() {
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

      await supabase.from("properties").update({ is_locked: true }).eq("id", property.id);

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
  const isLocked = Boolean(property.is_locked);

  return (
    <PageWrapper>
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col pb-24">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoFileChange}
        className="hidden"
        aria-hidden
      />

      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/properties/${property.id}`}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-[#0F172A]"
            aria-label="Back to property"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-[#0F172A]" style={fontStyle}>
            Report Workspace
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 max-w-[720px] mx-auto w-full overflow-y-auto">
        {detailsError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            {detailsError}
          </div>
        )}
        {roomCompleteError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            {roomCompleteError}
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

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[#414651] font-medium text-sm" style={fontStyle}>
              Progress
            </p>
            <p className="text-[#6B7280] text-sm" style={fontStyle}>
              {completedCount} of {rooms.length} rooms completed
            </p>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#008bff] rounded-full transition-all duration-300"
              style={{
                width: rooms.length ? `${(completedCount / rooms.length) * 100}%` : "0%",
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-4 max-h-[50vh] overflow-y-auto">
          {rooms.map((room) => {
            const rid = String(room.id);
            const photos = propertyPhotos[rid] ?? [];
            const isComplete = roomComplete[rid];
            const roomName = room.display_name || room.room_type || "Room";

            return (
              <div key={room.id} className="rounded-xl border border-gray-200 p-4 bg-white relative">
                <button
                  type="button"
                  onClick={() => handleDeleteRoom(rid)}
                  disabled={isLocked}
                  className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  aria-label="Delete room"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>

                <p className="font-semibold text-[#0F172A] text-base pr-8" style={fontStyle}>
                  {roomName}
                </p>

                <div className="grid grid-cols-3 gap-2 my-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      {photoUrls[String(photo.id)] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoUrls[String(photo.id)]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          Loading
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => openCameraForRoom(rid)}
                  disabled={photoUploadingFor === rid || isLocked}
                  className="w-full py-2.5 rounded-lg bg-[#008bff] text-white font-medium text-sm hover:bg-[#0077e6] flex items-center justify-center gap-2 mb-3 disabled:opacity-50"
                  style={{ ...fontStyle, color: "#ffffff" }}
                >
                  📷 {photoUploadingFor === rid ? "Uploading…" : "Take Photo"}
                </button>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isComplete}
                      onChange={(e) => handleRoomCompleteChange(rid, e.target.checked)}
                      disabled={isLocked}
                      className="w-4 h-4 rounded border-gray-300 text-[#008bff] focus:ring-[#008bff]"
                    />
                    <span className="text-sm text-[#414651]" style={fontStyle}>
                      Room Complete
                    </span>
                  </label>
                  <span className="text-sm text-[#6B7280]" style={fontStyle}>
                    {photos.length} photo{photos.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {!isLocked && (
          <button
            type="button"
            onClick={handleAddRoom}
            className="w-full py-3 rounded-xl bg-[#1a1a86] text-white font-medium text-base hover:bg-[#151566] flex items-center justify-center gap-2 mb-6"
            style={{ ...fontStyle, color: "#ffffff" }}
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
              disabled={!allRoomsComplete() || reportGenerating}
              className={`w-full py-3 rounded-lg font-medium text-base transition-colors ${
                allRoomsComplete() && !reportGenerating
                  ? "bg-[#008bff] text-white hover:bg-[#0077e6]"
                  : "bg-gray-400 text-gray-500 cursor-not-allowed"
              }`}
              style={{ ...fontStyle, color: allRoomsComplete() ? "#ffffff" : undefined }}
            >
              {reportGenerating ? "Generating…" : "Generate Report"}
            </button>
          )}
        </div>
      </div>
    </div>
    </PageWrapper>
  );
}

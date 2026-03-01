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
  move_in_date?: string | null;
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
  reportCompleted: initialReportCompleted,
  reportType,
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
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [photoStep, setPhotoStep] = useState<'idle' | 'preview'>('idle');
  const [photoNote, setPhotoNote] = useState('');
  const [previewRoomId, setPreviewRoomId] = useState<string | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [addRoomSelectedType, setAddRoomSelectedType] = useState<string | null>(null);
  const [addRoomCustomName, setAddRoomCustomName] = useState('');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<Photo | null>(null);
  const [viewingPhotoNote, setViewingPhotoNote] = useState('');
  const [viewingPhotoNoteSaving, setViewingPhotoNoteSaving] = useState(false);

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

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const roomId = activeCameraRoomId;
    if (!roomId || !property.id) return;
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      setActiveCameraRoomId(null);
      e.target.value = "";
      return;
    }
    setDetailsError(null);
    setPreviewFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    setPhotoStep("preview");
    setPreviewRoomId(roomId);
    setActiveCameraRoomId(null);
    e.target.value = "";
  };

  const retakePhoto = () => {
    setPreviewFile(null);
    setPreviewDataUrl(null);
    setPhotoStep("idle");
    setPhotoNote("");
    setPreviewRoomId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const savePhotoFromPreview = async () => {
    const roomId = previewRoomId;
    if (!roomId || !property.id || !previewFile) return;
    setPhotoUploadingFor(roomId);
    setDetailsError(null);
    try {
      const timestamp = Date.now();
      const storagePath = `${userId}/${property.id}/${roomId}/${timestamp}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from("photos")
        .upload(storagePath, previewFile, { contentType: "image/jpeg", upsert: false });

      if (uploadErr) {
        setDetailsError(uploadErr.message ?? "Failed to upload photo.");
        setPhotoUploadingFor(null);
        retakePhoto();
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
          note: photoNote.trim() || null,
          taken_at: takenAt,
        })
        .select("id, storage_path, room_id")
        .single();

      if (insertErr) {
        setDetailsError(insertErr.message ?? "Failed to save photo.");
        setPhotoUploadingFor(null);
        retakePhoto();
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
      retakePhoto();
    } catch {
      setDetailsError("Something went wrong.");
    } finally {
      setPhotoUploadingFor(null);
    }
  };

  const handleDeletePhoto = async (photo: Photo) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) return;
    setDetailsError(null);
    try {
      await supabase.storage.from("photos").remove([photo.storage_path]);
      const { error: deleteErr } = await supabase.from("photos").delete().eq("id", photo.id);
      if (deleteErr) {
        setDetailsError(deleteErr.message ?? "Failed to delete photo.");
        return;
      }
      const rid = String(photo.room_id);
      setPropertyPhotos((prev) => ({
        ...prev,
        [rid]: (prev[rid] ?? []).filter((p) => p.id !== photo.id),
      }));
      setPhotoUrls((prev) => {
        const next = { ...prev };
        delete next[String(photo.id)];
        return next;
      });
    } catch {
      setDetailsError("Something went wrong.");
    }
  };

  const savePhotoNote = async () => {
    if (!selectedPhotoForView) return;
    setViewingPhotoNoteSaving(true);
    setDetailsError(null);
    try {
      const { error } = await supabase
        .from("photos")
        .update({ note: viewingPhotoNote || null })
        .eq("id", selectedPhotoForView.id)
        .eq("user_id", userId);
      if (error) {
        setDetailsError(error.message ?? "Failed to save note.");
        return;
      }
      const rid = String(selectedPhotoForView.room_id);
      setPropertyPhotos((prev) => ({
        ...prev,
        [rid]: (prev[rid] ?? []).map((p) =>
          p.id === selectedPhotoForView.id ? { ...p, note: viewingPhotoNote || null } : p
        ),
      }));
      setSelectedPhotoForView(null);
    } catch {
      setDetailsError("Something went wrong.");
    } finally {
      setViewingPhotoNoteSaving(false);
    }
  };

  const handleRoomCompleteChange = (roomId: string, checked: boolean) => {
    setRoomCompleteError(null);
    const photos = propertyPhotos[roomId] ?? [];
    if (checked && photos.length === 0) {
      setRoomCompleteError("Room cannot be marked complete. At least one photo is required.");
      setRoomComplete((prev) => ({ ...prev, [roomId]: false }));
      return;
    }
    setRoomComplete((prev) => ({ ...prev, [roomId]: checked }));
  };

  const handleDeleteRoomClick = (roomId: string) => {
    setRoomToDelete(roomId);
  };

  const handleConfirmDeleteRoom = async () => {
    const roomId = roomToDelete;
    if (!roomId || !property.id) return;
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
        setRoomToDelete(null);
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
    } finally {
      setRoomToDelete(null);
    }
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

  const handleRenameRoomStart = (room: Room) => {
    setEditingRoomId(String(room.id));
    setEditingRoomName(room.display_name || room.room_type || "Room");
  };

  const handleRenameRoomSave = async () => {
    if (!editingRoomId || !editingRoomName.trim()) {
      setEditingRoomId(null);
      setEditingRoomName("");
      return;
    }
    const trimmed = editingRoomName.trim();
    setDetailsError(null);
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ display_name: trimmed })
        .eq("id", editingRoomId);
      if (error) {
        setDetailsError(error.message ?? "Failed to rename room.");
        return;
      }
      setRooms((prev) =>
        prev.map((r) => (String(r.id) === editingRoomId ? { ...r, display_name: trimmed } : r))
      );
    } catch {
      setDetailsError("Something went wrong.");
    } finally {
      setEditingRoomId(null);
      setEditingRoomName("");
    }
  };

  async function generateReport() {
    if (!allRoomsComplete()) {
      setDetailsError("Please mark all rooms as complete before generating your report.");
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
  const [reportCompleted, setReportCompleted] = useState(initialReportCompleted);
  const isLocked = reportCompleted;

  return (
    <PageWrapper>
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col pb-24">
      {photoStep === "preview" && previewDataUrl && !isLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto overflow-x-hidden">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[min(420px,calc(100vw-2rem))] min-w-0 p-6 my-auto max-h-[90vh] overflow-y-auto">
            <p className="text-[#0F172A] font-medium text-sm mb-3" style={fontStyle}>
              Preview
            </p>
            <div className="rounded-lg overflow-hidden mb-4 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewDataUrl}
                alt="Preview"
                className="block w-full max-w-full h-auto object-contain rounded-xl"
                style={{ maxHeight: "50vh" }}
              />
            </div>
            <p className="text-[#0F172A] font-medium text-sm mb-2" style={fontStyle}>
              Add an optional note
            </p>
            <input
              type="text"
              value={photoNote}
              onChange={(e) => setPhotoNote(e.target.value.slice(0, 500))}
              placeholder="e.g. Scratch on wall near door, approximately 15cm long"
              maxLength={500}
              className="w-full py-2.5 px-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] text-base outline-none focus:border-[#008bff] focus:ring-2 focus:ring-[#008bff]/20 mb-1"
              style={fontStyle}
            />
            <p className="text-[#94A3B8] text-xs mb-4" style={fontStyle}>
              {photoNote.length}/500
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={retakePhoto}
                className="flex-1 py-2.5 rounded-full border border-gray-200 bg-white text-[#0F172A] font-medium text-sm"
                style={fontStyle}
              >
                Retake
              </button>
              <button
                type="button"
                onClick={savePhotoFromPreview}
                disabled={photoUploadingFor !== null}
                className="flex-1 py-2.5 rounded-full bg-[#008bff] text-white font-medium text-sm disabled:opacity-50"
                style={{ ...fontStyle, color: "#ffffff" }}
              >
                {photoUploadingFor ? "Saving…" : "Save Photo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPhotoForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto overflow-x-hidden">
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-[min(420px,calc(100vw-2rem))] min-w-0 p-8 my-auto max-h-[90vh] overflow-y-auto">
            <div className="mb-6 min-w-0">
              {photoUrls[String(selectedPhotoForView.id)] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrls[String(selectedPhotoForView.id)]}
                  alt=""
                  className="block w-full max-w-full h-auto object-contain"
                  style={{ maxHeight: "50vh", borderRadius: "0.75rem" }}
                />
              ) : (
                <div className="flex items-center justify-center text-gray-400 py-12">Loading image…</div>
              )}
            </div>
            {isLocked ? (
              <p className="text-[#414651] text-sm min-h-[2rem]" style={fontStyle}>
                {selectedPhotoForView.note ?? "No note"}
              </p>
            ) : (
              <>
                <textarea
                  value={viewingPhotoNote}
                  onChange={(e) => setViewingPhotoNote(e.target.value.slice(0, 500))}
                  placeholder="Add a note for this photo"
                  maxLength={500}
                  rows={3}
                  className="w-full py-2.5 px-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] text-base outline-none focus:border-[#008bff] focus:ring-2 focus:ring-[#008bff]/20 mb-2 resize-none"
                  style={fontStyle}
                />
                <p className="text-[#94A3B8] text-xs mb-3" style={fontStyle}>
                  {viewingPhotoNote.length}/500
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPhotoForView(null)}
                    className="py-2 px-4 rounded-full border border-gray-200 bg-white text-[#0F172A] font-medium text-sm hover:bg-gray-50"
                    style={fontStyle}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={savePhotoNote}
                    disabled={viewingPhotoNoteSaving}
                    className="py-2 px-4 rounded-full bg-[#008bff] text-white font-medium text-sm disabled:opacity-50"
                    style={{ ...fontStyle, color: "#ffffff" }}
                  >
                    {viewingPhotoNoteSaving ? "Saving…" : "Save note"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-1" style={fontStyle}>
              Delete Room
            </h2>
            <p className="text-sm text-gray-500 mb-6" style={fontStyle}>
              Are you sure you want to delete this room? This will also delete all photos in it.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                className="shrink-0 py-2.5 px-5 rounded-lg font-medium text-sm text-white hover:opacity-90 transition-opacity"
                style={{ ...fontStyle, backgroundColor: "#008bff", color: "#ffffff" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRoom}
                className="flex-1 min-w-0 py-2.5 px-4 rounded-lg font-medium text-sm text-white bg-red-500 hover:bg-red-600 transition-colors"
                style={{ ...fontStyle, color: "#ffffff" }}
              >
                Yes, Delete Room
              </button>
            </div>
          </div>
        </div>
      )}

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
            {getReportTypeLabel(reportType)}
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
                  onClick={() => handleDeleteRoomClick(rid)}
                  disabled={isLocked}
                  className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  aria-label="Delete room"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>

                {editingRoomId === rid ? (
                  <input
                    type="text"
                    value={editingRoomName}
                    onChange={(e) => setEditingRoomName(e.target.value)}
                    onBlur={handleRenameRoomSave}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameRoomSave();
                    }}
                    autoFocus
                    className="font-semibold text-[#0F172A] text-base pr-8 w-full py-1 px-2 -mx-2 rounded border border-[#008bff] outline-none"
                    style={fontStyle}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => !isLocked && handleRenameRoomStart(room)}
                    disabled={isLocked}
                    className="font-semibold text-[#0F172A] text-base pr-8 w-full text-left py-0 border-0 bg-transparent cursor-pointer disabled:cursor-default hover:underline disabled:no-underline"
                    style={fontStyle}
                  >
                    {roomName}
                  </button>
                )}

                <div className="grid grid-cols-3 gap-2 my-3">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setSelectedPhotoForView(photo); setViewingPhotoNote(photo.note ?? ''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPhotoForView(photo); setViewingPhotoNote(photo.note ?? ''); } }}
                      className="relative w-full overflow-hidden rounded-lg bg-gray-100 cursor-pointer"
                      style={{ paddingBottom: '100%' }}
                    >
                      {photoUrls[String(photo.id)] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoUrls[String(photo.id)]}
                          alt=""
                          className="absolute top-0 left-0 w-full h-full object-cover object-center"
                        />
                      ) : (
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          Loading
                        </div>
                      )}
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo); }}
                          className="absolute top-1 right-1.5 w-4 h-4 flex items-center justify-center bg-white/40 rounded border-0 text-sm cursor-pointer"
                          aria-label="Delete photo"
                        >
                          <span
                            className="inline-block"
                            style={{ color: "#ef4444", textShadow: "0 0 2px rgba(0,0,0,1), 0 1px 2px rgba(0,0,0,0.8)" }}
                          >
                            X
                          </span>
                        </button>
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
              disabled={reportGenerating}
              className={`w-full py-3 rounded-lg font-medium text-base transition-colors ${
                !reportGenerating
                  ? "bg-[#008bff] text-white hover:bg-[#0077e6]"
                  : "bg-gray-400 text-gray-500 cursor-not-allowed"
              }`}
              style={{ ...fontStyle, color: !reportGenerating ? "#ffffff" : undefined }}
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

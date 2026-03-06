import { jsPDF } from "jspdf";
import * as exifr from "exifr";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PdfProperty = {
  id: string | number;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  property_type?: string | null;
  tenancy_start_date?: string | null;
};

export type PdfRoom = {
  id: string | number;
  display_name: string | null;
  room_type: string;
  custom_name: string | null;
  notes?: string | null;
};

export type PdfReport = {
  id: string;
  created_at: string | null;
  completed_at: string | null;
  report_type: string | null;
  movein_date_local?: string | null;
};

export type PhotoWithUrl = {
  id: string;
  room_id: string;
  note: string | null;
  taken_at: string | null;
  signedUrl: string;
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  "check-in": "Check-In Report",
  interim: "Interim Report",
  "check-out": "Check-Out Report",
};

function getReportTypeLabel(reportType: string | null | undefined): string {
  return REPORT_TYPE_LABELS[reportType ?? "check-in"] ?? "Check-In Report";
}

function formatAddress(p: PdfProperty): string {
  return [p.address_line1, p.address_line2, p.city, p.postcode].filter(Boolean).join(", ");
}

function formatCompletedDateForFilename(iso: string | null | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return new Date(iso).toISOString().slice(0, 10);
}

export type PdfFetchOptions = {
  supabase: SupabaseClient;
  userId: string;
};

/**
 * Generates a PDF report from report data and triggers a browser download.
 * Reuses the exact same PDF generation logic as the /r/[reportId] page.
 * When photosOrFetch is an array, those photos are used. When it is fetch options,
 * photos are queried inside this function with .eq("report_id", reportId), matching the /r/[reportId] page.
 */
export async function generateReportPdf(
  reportId: string,
  property: PdfProperty,
  report: PdfReport,
  rooms: PdfRoom[],
  photosOrFetch: PhotoWithUrl[] | PdfFetchOptions
): Promise<void> {
  let photosWithUrls: PhotoWithUrl[];
  if (Array.isArray(photosOrFetch)) {
    photosWithUrls = photosOrFetch;
  } else {
    const { data: photosData } = await photosOrFetch.supabase
      .from("photos")
      .select("id, storage_path, room_id, note, taken_at")
      .eq("property_id", property.id)
      .eq("report_id", reportId)
      .eq("user_id", photosOrFetch.userId)
      .order("taken_at", { ascending: true });

    photosWithUrls = [];
    for (const p of photosData ?? []) {
      const { data: signed } = await photosOrFetch.supabase.storage
        .from("photos")
        .createSignedUrl(p.storage_path, 3600);
      if (signed?.signedUrl) {
        photosWithUrls.push({
          id: p.id,
          room_id: p.room_id,
          note: p.note ?? null,
          taken_at: p.taken_at ?? null,
          signedUrl: signed.signedUrl,
        });
      }
    }
  }

  const photosWithData: { photo: PhotoWithUrl; dataUrl: string; width: number; height: number }[] = [];

  for (const photo of photosWithUrls) {
    const res = await fetch(photo.signedUrl);
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
  const addressFull = formatAddress(property);
  const reportTypeLabel = getReportTypeLabel(report.report_type);

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
    doc.text(reportId, margin, footerY);
    doc.setTextColor(55, 65, 81);
    doc.text(`Page ${pageNum}`, pageW - margin, footerY, { align: "right" });
  }

  if (coverDataUrl) doc.addImage(coverDataUrl, "PNG", 0, 0, pageW, pageH);

  doc.addPage();
  addHeader();
  let y = margin + 28;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text("Property Condition Report", margin, y);
  y += 10;

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
  doc.text(String(photosWithUrls.length), margin + 38, y);
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

  const safeAddress = (property.address_line1 || "Property")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 30);
  const reportTypeSlug = (reportTypeLabel ?? "Report").replace(/\s+/g, "_");
  const completedDate = formatCompletedDateForFilename(report.completed_at);
  const filename = `DepositGuard_${safeAddress}_${reportTypeSlug}_${completedDate}.pdf`;

  doc.save(filename);
}

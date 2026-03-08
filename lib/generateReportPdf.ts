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

  const photosWithData: {
    photo: PhotoWithUrl;
    dataUrl: string;
    width: number;
    height: number;
    cellDataUrl?: string;
  }[] = [];

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

  async function createSquareCellImage(
    dataUrl: string,
    srcW: number,
    srcH: number,
    pixelSize: number = 400
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = pixelSize;
        canvas.height = pixelSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        const scale = pixelSize / srcW;
        const drawH = srcH * scale;
        if (drawH >= pixelSize) {
          const cropH = pixelSize / scale;
          const sy = (srcH - cropH) / 2;
          ctx.drawImage(img, 0, sy, srcW, cropH, 0, 0, pixelSize, pixelSize);
        } else {
          const yOff = (pixelSize - drawH) / 2;
          ctx.drawImage(img, 0, 0, srcW, srcH, 0, yOff, pixelSize, drawH);
        }
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  for (const item of photosWithData) {
    item.cellDataUrl = await createSquareCellImage(item.dataUrl, item.width, item.height);
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

  // --- Room content pages layout (do not change cover/summary above) ---
  const roomMargin = 15;
  const printableWidth = pageW - 30;
  const gutter = 4;
  const columnWidth = (printableWidth - 2 * gutter) / 3;
  const cellSize = columnWidth;
  const footerSpace = 20;
  const contentBottom = pageH - footerSpace;
  const footerY = pageH - 10;
  const headerLogoHeight = 12;
  const captionGap = 4;
  const rowGap = 6;
  const ptToMm = 25.4 / 72;

  function addRoomPageHeader(): number {
    const headerTop = roomMargin;
    if (logoDataUrl) {
      try {
        const props = doc.getImageProperties(logoDataUrl);
        const logoW = (headerLogoHeight * props.width) / props.height;
        doc.addImage(logoDataUrl, "PNG", roomMargin, headerTop, logoW, headerLogoHeight);
      } catch {
        doc.addImage(logoDataUrl, "PNG", roomMargin, headerTop, 40, headerLogoHeight);
      }
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Property Condition Report", pageW / 2, headerTop + headerLogoHeight / 2 + 2, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(addressFull || "—", pageW - roomMargin, headerTop + headerLogoHeight / 2 + 2, { align: "right" });
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    const lineY = headerTop + headerLogoHeight + 2;
    doc.line(roomMargin, lineY, pageW - roomMargin, lineY);
    return lineY + 5;
  }

  function addRoomPageFooter(pageNum: number) {
    doc.setFontSize(7);
    doc.setTextColor(136, 136, 136);
    doc.text("Report ID", roomMargin, footerY - 4);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(reportId, roomMargin, footerY);
    doc.setFontSize(10);
    doc.setTextColor(136, 136, 136);
    doc.text(`Page ${pageNum}`, pageW - roomMargin, footerY, { align: "right" });
  }

  function formatTimestamp(iso: string | null | undefined): string {
    if (!iso) return "—";
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    const tz = d.toLocaleTimeString("en-GB", { timeZoneName: "short" }).split(" ").pop() ?? "GMT";
    return `${date}, ${time} ${tz}`;
  }

  function getCaptionHeight(photo: PhotoWithUrl, _index: number, _total: number): number {
    let h = 7 * ptToMm + 8 * ptToMm + 2 + 7 * ptToMm;
    if (photo.note && photo.note.trim()) h += 8 * ptToMm;
    return h;
  }

  function drawCaption(
    photo: PhotoWithUrl,
    index: number,
    total: number,
    x: number,
    y: number,
    cellW: number
  ): void {
    doc.setFontSize(7);
    doc.setTextColor(136, 136, 136);
    doc.text(`Photo ${index + 1} of ${total}`, x, y);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(formatTimestamp(photo.taken_at), x, y + 7 * ptToMm);
    doc.setFontSize(7);
    doc.setTextColor(136, 136, 136);
    doc.text("Notes", x, y + 7 * ptToMm + 8 * ptToMm + 2);
    if (photo.note && photo.note.trim()) {
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(photo.note.trim(), x, y + 7 * ptToMm + 8 * ptToMm + 2 + 7 * ptToMm, { maxWidth: cellW });
    }
  }

  rooms.forEach((room) => {
    const roomPhotos = photosWithData.filter((p) => String(p.photo.room_id) === String(room.id));
    if (roomPhotos.length === 0) return;

    doc.addPage();
    let contentY = addRoomPageHeader();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(room.display_name || room.room_type || "Room", roomMargin, contentY);
    contentY += 8;

    const totalInRoom = roomPhotos.length;
    const photosPerRow = 3;

    for (let rowStart = 0; rowStart < roomPhotos.length; rowStart += photosPerRow) {
      const rowPhotos = roomPhotos.slice(rowStart, rowStart + photosPerRow);
      const maxCaptionH = Math.max(...rowPhotos.map((item, i) => getCaptionHeight(item.photo, rowStart + i, totalInRoom)));
      const rowHeight = cellSize + captionGap + maxCaptionH;
      const neededY = contentY + rowHeight + (rowStart + photosPerRow <= roomPhotos.length ? rowGap : 0);

      if (neededY > contentBottom) {
        addRoomPageFooter(doc.getNumberOfPages());
        doc.addPage();
        contentY = addRoomPageHeader();
      }

      for (let col = 0; col < rowPhotos.length; col++) {
        const item = rowPhotos[col];
        const x = roomMargin + col * (columnWidth + gutter);
        const imgData = item.cellDataUrl ?? item.dataUrl;
        doc.addImage(imgData, "JPEG", x, contentY, cellSize, cellSize);

        const captionY = contentY + cellSize + captionGap;
        drawCaption(item.photo, rowStart + col, totalInRoom, x, captionY, columnWidth);
      }

      const maxCaptionHThisRow = Math.max(
        ...rowPhotos.map((item, i) => getCaptionHeight(item.photo, rowStart + i, totalInRoom))
      );
      contentY += cellSize + captionGap + maxCaptionHThisRow + rowGap;
    }

    addRoomPageFooter(doc.getNumberOfPages());
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

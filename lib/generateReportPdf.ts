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
  photosOrFetch: PhotoWithUrl[] | PdfFetchOptions,
  returnBlob?: boolean
): Promise<void | { blob: Blob; filename: string }> {
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
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    });
  }

  async function createSquareCellImage(
    dataUrl: string,
    srcW: number,
    srcH: number,
    pixelSize: number = 800
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
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pixelSize, pixelSize);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, pixelSize, pixelSize, 20);
        ctx.clip();
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
        ctx.restore();
        resolve(canvas.toDataURL("image/jpeg", 0.85));
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

  let coverJpegDataUrl: string | null = null;
  if (coverDataUrl) {
    const img = new window.Image();
    img.src = coverDataUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
    });
    const canvas = document.createElement("canvas");
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    const maxSide = 1754;
    const scale = Math.min(1, maxSide / Math.max(naturalW, naturalH));
    const targetW = Math.round(naturalW * scale);
    const targetH = Math.round(naturalH * scale);
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0, targetW, targetH);
      coverJpegDataUrl = canvas.toDataURL("image/jpeg", 0.8);
    }
  }

  let logoJpegDataUrl: string | null = null;
  if (logoDataUrl) {
    const img = new window.Image();
    img.src = logoDataUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
    });
    const canvas = document.createElement("canvas");
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    const maxHeight = 80;
    const scale = Math.min(1, maxHeight / naturalH);
    const targetH = Math.round(naturalH * scale);
    const targetW = Math.round(naturalW * scale);
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, targetW, targetH);
      logoJpegDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    }
  }

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
    if (logoJpegDataUrl) doc.addImage(logoJpegDataUrl, "JPEG", margin, headerTop, logoWidth, logoHeight, "dg-logo");
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

  function formatTimestamp(iso: string | null | undefined): string {
    if (!iso) return "—";
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    const tz = d.toLocaleTimeString("en-GB", { timeZoneName: "short" }).split(" ").pop() ?? "GMT";
    return `${date}, ${time} ${tz}`;
  }

  if (coverJpegDataUrl) {
    doc.addImage(coverJpegDataUrl, "JPEG", 0, 0, pageW, pageH);
  } else if (coverDataUrl) {
    doc.addImage(coverDataUrl, "PNG", 0, 0, pageW, pageH);
  }

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
  y += 8;
  doc.setTextColor(100, 116, 139);
  doc.text("Property Type", margin, y);
  doc.setTextColor(15, 23, 42);
  doc.text(property.property_type ?? "—", margin + 38, y);
  y += 8;
  doc.setTextColor(100, 116, 139);
  doc.text("Total Rooms", margin, y);
  doc.setTextColor(15, 23, 42);
  doc.text(String(rooms.length), margin + 38, y);
  y += 8;
  doc.setTextColor(100, 116, 139);
  doc.text("Total Photos", margin, y);
  doc.setTextColor(15, 23, 42);
  doc.text(String(photosWithUrls.length), margin + 38, y);
  y += 8;
  doc.setTextColor(100, 116, 139);
  doc.text("Tenancy Start Date", margin, y);
  doc.setTextColor(15, 23, 42);
  doc.text(report.movein_date_local ?? "—", margin + 38, y);
  y += 8;
  doc.setTextColor(100, 116, 139);
  doc.text("Report Started", margin, y);
  doc.setTextColor(15, 23, 42);
  doc.text(formatTimestamp(report.created_at), margin + 38, y);
  y += 8;
  doc.setTextColor(100, 116, 139);
  doc.text("Report Completed", margin, y);
  doc.setTextColor(15, 23, 42);
  doc.text(formatTimestamp(report.completed_at), margin + 38, y);
  y += 8;
  doc.setTextColor(100, 116, 139);
  doc.text("View your report online", margin, y);
  y += 5;
  const viewOnlineUrl = `https://staging.depositguard.com/r/${reportId}`;
  doc.setFillColor(11, 165, 222);
  doc.roundedRect(margin, y, 60, 9, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("View Report", margin + 30, y + 6, { align: "center" });
  doc.link(margin, y, 60, 9, { url: viewOnlineUrl });
  y += 14;
  addFooter(2);

  // --- Room content pages layout (do not change cover/summary above) ---
  const roomMargin = 15;
  const printableWidth = pageW - 30;
  const gutter = 4;
  const columnWidth = (printableWidth - 2 * gutter) / 3;
  const cellWidth = columnWidth;
  const cellHeight = columnWidth * 1.2;
  const footerSpace = 20;
  const contentBottom = pageH - footerSpace;
  const roomFooterY = pageH - 12;
  const headerLogoHeight = 12;
  const captionGap = 5;
  const captionLine1ToTimestampGap = 2;
  const rowGap = 10;
  const ptToMm = 25.4 / 72;
  const photoCornerRadius = 3;

  function getRoomAddressLines(): [string, string] {
    if (property.address_line1 != null && property.address_line1 !== "") {
      const line1 = property.address_line1 + (property.address_line2 ? ", " + property.address_line2 : "");
      const line2 = [property.city, property.postcode].filter(Boolean).join(", ") || "—";
      return [line1.trim(), line2];
    }
    const full = addressFull || "—";
    const firstComma = full.indexOf(",");
    if (firstComma === -1) return [full, "—"];
    return [full.slice(0, firstComma).trim(), full.slice(firstComma + 1).trim() || "—"];
  }

  function addRoomPageHeader(): number {
    const headerTop = roomMargin;
    if (logoDataUrl) {
      try {
        const props = doc.getImageProperties(logoDataUrl);
        const logoW = (headerLogoHeight * props.width) / props.height;
        if (logoJpegDataUrl) {
          doc.addImage(logoJpegDataUrl, "JPEG", roomMargin, headerTop, logoW, headerLogoHeight, "dg-logo");
        }
      } catch {
        if (logoJpegDataUrl) {
          doc.addImage(logoJpegDataUrl, "JPEG", roomMargin, headerTop, 40, headerLogoHeight, "dg-logo");
        }
      }
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Property Condition Report", pageW / 2, headerTop + headerLogoHeight / 2 + 2, { align: "center" });
    const [addrLine1, addrLine2] = getRoomAddressLines();
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(addrLine1, pageW - roomMargin, headerTop + headerLogoHeight / 2, { align: "right" });
    doc.text(addrLine2, pageW - roomMargin, headerTop + headerLogoHeight / 2 + 4, { align: "right" });
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    const lineY = headerTop + headerLogoHeight + 2;
    doc.line(roomMargin, lineY, pageW - roomMargin, lineY);
    return lineY + 12;
  }

  function addRoomPageFooter(pageNum: number) {
    doc.setFontSize(7);
    doc.setTextColor(136, 136, 136);
    doc.text("Report ID", roomMargin, roomFooterY - 4);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(reportId, roomMargin, roomFooterY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(136, 136, 136);
    doc.text(`Page ${pageNum}`, pageW - roomMargin, roomFooterY, { align: "right" });
  }

  function getCaptionHeight(photo: PhotoWithUrl, _index: number, _total: number): number {
    const timestampToNotesGap = 2;
    let h =
      7 * ptToMm +
      captionLine1ToTimestampGap +
      8 * ptToMm +
      timestampToNotesGap +
      7 * ptToMm;
    if (photo.note && photo.note.trim()) h += 8 * ptToMm;
    return h;
  }

  function drawCaption(
    photo: PhotoWithUrl,
    index: number,
    total: number,
    captionLeftX: number,
    y: number,
    cellW: number
  ): void {
    const timestampToNotesGap = 2;
    const textOpts = { align: "left" as const };
    doc.setFontSize(7);
    doc.setTextColor(136, 136, 136);
    doc.text(`Photo ${index + 1} of ${total}`, captionLeftX, y, textOpts);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(
      formatTimestamp(photo.taken_at),
      captionLeftX,
      y + 7 * ptToMm + captionLine1ToTimestampGap,
      textOpts
    );
    doc.setFontSize(7);
    doc.setTextColor(136, 136, 136);
    doc.text(
      "Notes",
      captionLeftX,
      y + 7 * ptToMm + captionLine1ToTimestampGap + 8 * ptToMm + timestampToNotesGap,
      textOpts
    );
    if (photo.note && photo.note.trim()) {
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(
        photo.note.trim(),
        captionLeftX,
        y +
          7 * ptToMm +
          captionLine1ToTimestampGap +
          8 * ptToMm +
          timestampToNotesGap +
          7 * ptToMm,
        { ...textOpts, maxWidth: cellW }
      );
    }
  }

  rooms.forEach((room) => {
    const roomPhotos = photosWithData.filter((p) => String(p.photo.room_id) === String(room.id));
    if (roomPhotos.length === 0) return;

    doc.addPage();
    let contentY = addRoomPageHeader();
    doc.setFontSize(15);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(17, 24, 39);
    doc.text(room.display_name || room.room_type || "Room", roomMargin, contentY);
    contentY += 8;

    const totalInRoom = roomPhotos.length;
    const photosPerRow = 3;

    for (let rowStart = 0; rowStart < roomPhotos.length; rowStart += photosPerRow) {
      const rowPhotos = roomPhotos.slice(rowStart, rowStart + photosPerRow);
      const maxCaptionH = Math.max(...rowPhotos.map((item, i) => getCaptionHeight(item.photo, rowStart + i, totalInRoom)));
      const rowHeight = cellHeight + captionGap + maxCaptionH;
      const neededY = contentY + rowHeight + (rowStart + photosPerRow <= roomPhotos.length ? rowGap : 0);

      if (neededY > contentBottom) {
        addRoomPageFooter(doc.getNumberOfPages());
        doc.addPage();
        contentY = addRoomPageHeader();
      }

      for (let col = 0; col < rowPhotos.length; col++) {
        const item = rowPhotos[col];
        const photoLeftX = roomMargin + col * (columnWidth + gutter);
        const imgData = item.cellDataUrl ?? item.dataUrl;
        doc.addImage(imgData, "JPEG", photoLeftX, contentY, cellWidth, cellHeight);

        const captionY = contentY + cellHeight + captionGap;
        drawCaption(item.photo, rowStart + col, totalInRoom, photoLeftX, captionY, cellWidth);
      }

      const maxCaptionHThisRow = Math.max(
        ...rowPhotos.map((item, i) => getCaptionHeight(item.photo, rowStart + i, totalInRoom))
      );
      contentY += cellHeight + captionGap + maxCaptionHThisRow + rowGap;
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

  if (returnBlob) {
    const blob = doc.output("blob") as Blob;
    return { blob, filename };
  }

  doc.save(filename);
}

export async function uploadAndStorePdf(
  blob: Blob,
  reportId: string,
  filename: string,
  supabase: SupabaseClient
): Promise<string> {
  const path = `${reportId}/${filename}`;

  const { error: uploadError } = await supabase.storage.from("pdfs").upload(path, blob, {
    contentType: "application/pdf",
    upsert: true,
  });
  // eslint-disable-next-line no-console
  console.log("PDF upload result:", uploadError ?? "success");
  if (uploadError) throw uploadError;

  const { data: signed, error: signedError } = await supabase.storage
    .from("pdfs")
    .createSignedUrl(path, 315360000);
  // eslint-disable-next-line no-console
  console.log("Signed URL result:", signedError ?? signed?.signedUrl);
  if (signedError || !signed?.signedUrl) {
    throw signedError ?? new Error("Failed to create signed URL for PDF.");
  }

  const pdfUrl = signed.signedUrl;
  const { error: updateError } = await supabase
    .from("reports")
    .update({ pdf_url: pdfUrl })
    .eq("id", reportId);
  // eslint-disable-next-line no-console
  console.log("DB update result:", updateError ?? "success");
  if (updateError) throw updateError;

  return pdfUrl;
}

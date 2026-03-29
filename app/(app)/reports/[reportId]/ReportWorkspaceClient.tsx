"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { generateReportPdf, uploadAndStorePdf } from "@/lib/generateReportPdf";
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
  is_complete?: boolean | null;
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
  "check-in": "Move-In Report",
  interim: "Interim Report",
  "check-out": "Move-Out Report",
};

function getReportTypeLabel(reportType: string | null | undefined): string {
  return REPORT_TYPE_LABELS[reportType ?? "check-in"] ?? "Move-In Report";
}

/** Sticky footer CTA when payment is still required (Stripe checkout). */
const COMPLETE_REPORT_PAY_CTA_LABEL = "Complete Report";

type ReportWorkspaceClientProps = {
  userId: string;
  reportId: string;
  property: Property;
  reportCompleted: boolean;
  reportType?: string | null;
  completedAt?: string | null;
  checkoutAtLocal?: string | null;
  moveinDateLocal?: string | null;
  paymentStatus?: string;
  rooms: Room[];
  photosData: Photo[];
  paymentSuccessFromUrl?: boolean;
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
  paymentStatus = "unpaid",
  rooms: initialRooms,
  photosData,
  paymentSuccessFromUrl = false,
}: ReportWorkspaceClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [paymentsSettingsLoaded, setPaymentsSettingsLoaded] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState(false);
  const paymentSuccessHandled = useRef(false);
  const generateReportRef = useRef<() => void>(() => {});

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : { payments_enabled: false }))
      .then((data) => {
        setPaymentsEnabled(Boolean(data.payments_enabled));
      })
      .catch(() => setPaymentsEnabled(false))
      .finally(() => setPaymentsSettingsLoaded(true));
  }, []);

  useEffect(() => {
    if (!paymentSuccessFromUrl || paymentSuccessHandled.current) return;
    paymentSuccessHandled.current = true;
    setPaymentSuccessMessage(true);
    router.replace(`/reports/${reportId}`, { scroll: false });
    const t = setTimeout(() => {
      setPaymentSuccessMessage(false);
      generateReportRef.current();
    }, 1500);
    return () => clearTimeout(t);
  }, [paymentSuccessFromUrl, reportId, router]);

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
  const [showGenerateConfirmModal, setShowGenerateConfirmModal] = useState(false);
  const [showIncompleteRoomsModal, setShowIncompleteRoomsModal] = useState(false);
  const [addRoomSelectedType, setAddRoomSelectedType] = useState<string | null>(null);
  const [addRoomCustomName, setAddRoomCustomName] = useState('');
  const [reportCompleted, setReportCompleted] = useState(initialReportCompleted);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [roomDeleting, setRoomDeleting] = useState(false);
  const [paymentRedirecting, setPaymentRedirecting] = useState(false);
  const isLocked = reportCompleted;

  const completedCount = rooms.filter((r) => r.is_complete === true).length;
  const effectiveCompletedCount = isLocked ? rooms.length : completedCount;
  const allRoomsComplete = () => {
    if (rooms.length === 0) return false;
    return rooms.every((r) => r.is_complete === true);
  };
  const incompleteRoomNames = () =>
    rooms.filter((r) => r.is_complete !== true).map((r) => r.display_name || r.room_type || "Room");

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
    const displayName = sameTypeRooms.length === 0 ? baseName : `${baseName} ${sameTypeRooms.length + 1}`;

    setDetailsError(null);
    try {
      const { data: newRoom, error } = await supabase
        .from("rooms")
        .insert({
          report_id: reportId,
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
      const newRoomWithComplete = { ...(newRoom as Room), is_complete: false };
      const nextRooms = [...rooms, newRoomWithComplete];
      const renumbered = await renumberRoomsAndPersist(nextRooms);
      setRooms(renumbered);
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
      const names = incompleteRoomNames();
      setDetailsError(
        names.length > 0
          ? `Mark these rooms as complete before finishing: ${names.join(", ")}`
          : "All rooms must be marked complete before generating your report."
      );
      return;
    }
    const totalPhotos = Object.values(propertyPhotos).flat().length;
    if (totalPhotos === 0) return;
    setReportGenerating(true);
    setDetailsError(null);
    try {
      const photoIds = Object.values(propertyPhotos).flat().map((p) => p.id);
      if (photoIds.length > 0) {
        const { error: photoUpdateError } = await supabase
          .from("photos")
          .update({ report_id: reportId })
          .in("id", photoIds)
          .eq("user_id", userId);
        if (photoUpdateError) throw new Error(photoUpdateError.message ?? "Failed to tag photos with report.");
      }

      const { error: updateError } = await supabase
        .from("reports")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", reportId)
        .eq("user_id", userId);

      if (updateError) throw new Error(updateError.message ?? "Failed to update report.");

      fetch("/api/notify/report-completed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      }).catch(() => {});

      setReportCompleted(true);

      (async () => {
        try {
          const { data: roomsData } = await supabase
            .from("rooms")
            .select("id, display_name, room_type, custom_name, notes")
            .eq("report_id", reportId)
            .eq("user_id", userId)
            .order("created_at", { ascending: true });

          const { data: completedReport } = await supabase
            .from("reports")
            .select("id, created_at, completed_at, report_type, movein_date_local")
            .eq("id", reportId)
            .single();

          if (completedReport && roomsData) {
            const result = await generateReportPdf(
              reportId,
              property,
              {
                id: reportId,
                created_at: completedReport.created_at,
                completed_at: completedReport.completed_at,
                report_type: completedReport.report_type,
                movein_date_local: completedReport.movein_date_local,
              },
              roomsData,
              { supabase, userId },
              true
            );
            if (result) {
              await uploadAndStorePdf(result.blob, reportId, result.filename, supabase);
            }
          }
        } catch {
          // Silent failure — user can download manually from the report page which will regenerate if needed
        }
      })();

      router.replace(`/r/${reportId}`);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Failed to generate report.");
    } finally {
      setReportGenerating(false);
    }
  }

  useEffect(() => {
    generateReportRef.current = generateReport;
  });

  async function handleFinishAndPay() {
    if (!allRoomsComplete()) {
      setShowIncompleteRoomsModal(true);
      return;
    }
    setDetailsError(null);
    setPaymentRedirecting(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.alreadyPaid) {
        router.refresh();
        return;
      }
      if (!res.ok || !data.url) {
        setDetailsError(data.error ?? "Could not start checkout. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setDetailsError("Something went wrong. Please try again.");
    } finally {
      setPaymentRedirecting(false);
    }
  }

  async function handleSaveCheckoutDate() {
    if (!checkoutDateInput.trim()) {
      setCheckoutDateError("Please select a move-out date.");
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
        .select("pdf_url, report_type, completed_at, created_at, movein_date_local")
        .eq("id", reportId)
        .eq("user_id", userId)
        .single();

      if (reportError || !report) {
        setDetailsError("Report not found.");
        return;
      }

      if (report.pdf_url) {
        const res = await fetch(report.pdf_url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = report.pdf_url.split("/").pop()?.split("?")[0] ?? "report.pdf";
        a.click();
        URL.revokeObjectURL(blobUrl);
        return;
      }

      const { data: roomsData } = await supabase
        .from("rooms")
        .select("id, display_name, room_type, custom_name, notes")
        .eq("report_id", reportId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      const result = await generateReportPdf(
        reportId,
        property,
        {
          id: reportId,
          created_at: report.created_at,
          completed_at: report.completed_at,
          report_type: report.report_type,
          movein_date_local: report.movein_date_local,
        },
        roomsData ?? [],
        { supabase, userId },
        true
      );

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
    } catch {
      setDetailsError("Failed to download report.");
    } finally {
      setReportGenerating(false);
    }
  }

  const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };
  const roomHref = (rid: string) => `/rooms/${rid}?reportId=${reportId}`;

  function getRoomGroupKey(r: Room): string {
    return r.room_type === "Custom" ? (r.custom_name || "Custom").trim() || "Custom" : r.room_type;
  }

  async function renumberRoomsAndPersist(roomsList: Room[]): Promise<Room[]> {
    const groups: Record<string, Room[]> = {};
    roomsList.forEach((room) => {
      const key = getRoomGroupKey(room);
      if (!groups[key]) groups[key] = [];
      groups[key].push(room);
    });
    const sortedGroups = Object.values(groups).map((group) =>
      [...group].sort((a, b) => String(a.id).localeCompare(String(b.id)))
    );
    const updates: { id: string | number; display_name: string }[] = [];
    const result: Room[] = [];
    for (const group of sortedGroups) {
      const baseName = getRoomGroupKey(group[0]);
      for (let i = 0; i < group.length; i++) {
        const room = group[i];
        const newDisplay = group.length === 1 ? baseName : `${baseName} ${i + 1}`;
        result.push({ ...room, display_name: newDisplay });
        if (room.display_name !== newDisplay) {
          updates.push({ id: room.id, display_name: newDisplay });
        }
      }
    }
    if (updates.length > 0) {
      await Promise.all(
        updates.map((u) =>
          supabase.from("rooms").update({ display_name: u.display_name }).eq("id", u.id).eq("report_id", reportId)
        )
      );
    }
    return result.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }

  async function handleConfirmDeleteRoom() {
    const rid = roomToDelete;
    if (!rid) return;
    setRoomDeleting(true);
    setDetailsError(null);
    try {
      const photos = propertyPhotos[rid] ?? [];
      for (const p of photos) {
        if (p.storage_path) {
          await supabase.storage.from("photos").remove([p.storage_path]);
        }
      }
      await supabase.from("photos").delete().eq("room_id", rid).eq("report_id", reportId);
      const { error } = await supabase.from("rooms").delete().eq("id", rid).eq("report_id", reportId);
      if (error) {
        setDetailsError(error.message ?? "Failed to delete room.");
        setRoomDeleting(false);
        return;
      }
      const remaining = rooms.filter((r) => String(r.id) !== rid);
      const renumbered = await renumberRoomsAndPersist(remaining);
      setRooms(renumbered);
      setPropertyPhotos((prev) => {
        const next = { ...prev };
        delete next[rid];
        return next;
      });
      setRoomToDelete(null);
    } catch {
      setDetailsError("Something went wrong. Please try again.");
    } finally {
      setRoomDeleting(false);
    }
  }

  return (
    <PageWrapper>
    <div className="flex min-h-screen flex-col bg-[#F8F8F8] pb-24 lg:bg-transparent lg:pb-24">
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

      {showIncompleteRoomsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
          onClick={() => setShowIncompleteRoomsModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-[400px] w-full p-6 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[#0F172A] mb-1" style={fontStyle}>
              Incomplete Rooms
            </h2>
            <div className="text-sm text-gray-500 mb-6 space-y-3" style={fontStyle}>
              {rooms.filter((r) => r.is_complete !== true).length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-[#0F172A]">
                  {rooms
                    .filter((r) => r.is_complete !== true)
                    .map((r) => (
                      <li key={String(r.id)}>{r.display_name || r.room_type || "Room"}</li>
                    ))}
                </ul>
              )}
              <p className="mb-0">
                All rooms must be marked as complete before you can finish your report.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowIncompleteRoomsModal(false)}
              className="w-full py-2.5 rounded-lg bg-[#008bff] text-white font-medium text-sm hover:bg-[#0077e6]"
              style={{ ...fontStyle, color: "#ffffff" }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showGenerateConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
          onClick={() => !reportGenerating && setShowGenerateConfirmModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-[400px] w-full p-6 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[#0F172A] mb-1" style={fontStyle}>
              Finish Report?
            </h2>
            <p className="text-sm text-gray-500 mb-6" style={fontStyle}>
              Once your report has been generated, it cannot be edited. No further photos or notes can be added.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowGenerateConfirmModal(false)}
                className="flex-[1] py-2.5 rounded-lg border border-gray-200 bg-white text-[#0F172A] font-medium text-sm hover:bg-gray-50"
                style={fontStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGenerateConfirmModal(false);
                  generateReport();
                }}
                disabled={reportGenerating}
                className="flex-[2] py-2.5 rounded-lg bg-[#008bff] text-white font-medium text-sm hover:bg-[#0077e6] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ ...fontStyle, color: "#ffffff" }}
              >
                {reportGenerating ? "Generating…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportType === "check-out" && !checkoutAtLocal ? (
        <>
          <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="tap-feedback-touch active:opacity-75 p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-[#0F172A] bg-transparent border-none cursor-pointer"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label="Back to property"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-[#0F172A]" style={fontStyle}>
                {getReportTypeLabel(reportType)}
              </h1>
            </div>
          </header>
          <div className="mx-auto hidden w-full max-w-[720px] border-b border-gray-200 pb-6 pt-0 lg:block lg:max-w-none">
            <h1 className="text-lg font-semibold text-[#0F172A]" style={fontStyle}>
              {getReportTypeLabel(reportType)}
            </h1>
          </div>
          <main className="mx-auto w-full max-w-[720px] flex-1 overflow-y-auto px-4 py-5 lg:mx-0 lg:max-w-none lg:px-0 lg:py-0">
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6">
              <p className="text-[#0F172A] font-medium mb-2" style={fontStyle}>
                What is your move-out date?
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
          <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="tap-feedback-touch active:opacity-75 p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-[#0F172A] bg-transparent border-none cursor-pointer"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label="Back to property"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-[#0F172A]" style={fontStyle}>
                {getReportTypeLabel(reportType)}
              </h1>
            </div>
          </header>

          <div className="mx-auto hidden w-full max-w-[720px] border-b border-gray-200 pb-6 pt-0 lg:block lg:max-w-none">
            <h1 className="text-lg font-semibold text-[#0F172A]" style={fontStyle}>
              {getReportTypeLabel(reportType)}
            </h1>
          </div>

          <main className="mx-auto w-full max-w-[720px] flex-1 overflow-y-auto px-4 py-5 lg:mx-0 lg:max-w-none lg:px-0 lg:py-0">
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
        {paymentSuccessMessage && (
          <div className="mb-4 py-2.5 px-3 rounded-lg bg-green-50 text-green-800 text-sm border border-green-200 flex items-center gap-2" style={fontStyle}>
            <span>Payment confirmed — your report is ready to generate.</span>
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
                    Move-Out Date
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
            const isComplete = isLocked || room.is_complete === true;
            const roomName = room.display_name || room.room_type || "Room";

            return (
              <div
                key={room.id}
                className="rounded-xl border border-gray-200 p-4 bg-white flex items-center gap-3"
              >
                <Link
                  href={roomHref(rid)}
                  className="flex-1 flex items-center gap-3 min-w-0 active:opacity-75 transition-opacity tap-feedback-touch"
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
                {!isLocked && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setRoomToDelete(rid);
                    }}
                    className="shrink-0 p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label={`Delete ${roomName}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {roomToDelete !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
            onClick={() => !roomDeleting && setRoomToDelete(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl max-w-[400px] w-full p-6 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-[#0F172A] mb-1" style={fontStyle}>
                Delete this room?
              </h2>
              <p className="text-sm text-gray-500 mb-6" style={fontStyle}>
                All photos in this room will also be deleted.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => !roomDeleting && setRoomToDelete(null)}
                  disabled={roomDeleting}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 bg-white text-[#0F172A] font-medium text-sm disabled:opacity-50"
                  style={fontStyle}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteRoom}
                  disabled={roomDeleting}
                  className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 disabled:opacity-50"
                  style={{ ...fontStyle, color: "#ffffff" }}
                >
                  {roomDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

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

      <div className="fixed bottom-0 left-0 right-0 z-30 w-full border-t border-gray-200 bg-white p-4 safe-area-pb lg:left-60 lg:px-10 lg:py-4">
        <div className="mx-auto w-full max-w-[720px] lg:max-w-none">
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
            (() => {
              const needsPayment = paymentsSettingsLoaded && paymentsEnabled && paymentStatus !== "paid";
              const isPayFlow = needsPayment;
              const busy = reportGenerating || paymentRedirecting;
              const roomsIncomplete = !allRoomsComplete();
              const looksDisabled = busy || roomsIncomplete;
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (busy) return;
                    if (!allRoomsComplete()) {
                      setShowIncompleteRoomsModal(true);
                      return;
                    }
                    if (isPayFlow) {
                      handleFinishAndPay();
                    } else {
                      setShowGenerateConfirmModal(true);
                    }
                  }}
                  disabled={busy}
                  className={`w-full py-3 rounded-lg font-medium text-base transition-colors pointer-events-auto ${
                    looksDisabled
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-[#008bff] text-white hover:bg-[#0077e6]"
                  }`}
                  style={{ ...fontStyle, color: looksDisabled ? undefined : "#ffffff" }}
                >
                  {paymentRedirecting
                    ? "Redirecting…"
                    : reportGenerating
                      ? "Generating…"
                      : isPayFlow
                        ? COMPLETE_REPORT_PAY_CTA_LABEL
                        : "Generate Report"}
                </button>
              );
            })()
          )}
        </div>
      </div>
        </>
      )}
    </div>
    </PageWrapper>
  );
}

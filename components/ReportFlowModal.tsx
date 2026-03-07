"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toTitleCase, formatPostcode } from "@/lib/format";

type ReportStep =
  | "select-property"
  | "create-property"
  | "property-details"
  | "generate";

type CreatePropertySubStep = "address" | "report-type";

type Property = {
  id: string | number;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  property_type: string | null;
};

type RoomFormItem = {
  id: string;
  roomType: string;
  customName: string;
};

type PropertyDetail = {
  id: string | number;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  property_type: string | null;
  notes?: string | null;
};

type RoomDetail = {
  id: string | number;
  display_name: string | null;
  room_type: string;
  custom_name: string | null;
};

type PhotoDetail = {
  id: string | number;
  storage_path: string;
  room_id: string | number;
};

const PROPERTY_TYPES = ["House", "Apartment", "Flat", "Bungalow", "Studio"] as const;

const ROOM_TYPES = [
  "Living Room",
  "Bedroom",
  "Bathroom",
  "Kitchen",
  "Study",
  "Utility",
  "En-Suite",
  "Dining",
  "Storage",
  "Attic",
  "Basement",
  "Outdoor (Garage/Shed)",
  "Custom",
] as const;

const ADD_ROOM_TYPES = [
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

const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

const inputClass =
  "w-full py-2.5 px-3 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] text-base outline-none focus:border-[#008bff] focus:ring-2 focus:ring-[#008bff]/20";

function formatAddress(p: Property): string {
  const parts = [
    p.address_line1,
    p.address_line2,
    p.city,
    p.postcode,
  ].filter(Boolean);
  return parts.join(", ");
}

function generateId() {
  return Math.random().toString(36).slice(2);
}

const fadeScaleTransition = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.2, ease: "easeInOut" as const },
};

const REPORT_TYPES_CREATE = [
  { value: "check-in", label: "Check-In" },
  { value: "interim", label: "Interim" },
  { value: "check-out", label: "Check-Out" },
] as const;

type ReportFlowModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  /** Called with (propertyId, reportId?). When reportId is provided (Flow A), caller should navigate to /reports/[reportId]. */
  onPropertyCreated?: (propertyId: string | number, reportId?: string) => void;
  /** When provided, selecting an existing property closes the modal and calls this instead of continuing to property-details. */
  onPropertySelected?: (propertyId: string | number) => void;
  /** When true, open directly at the create-property step (skip property selection). */
  startAtCreateProperty?: boolean;
  /** "with-report" = Dashboard Create New Report: address → report type → create property + report, then navigate to report. "property-only" = Properties Create New Property: address only → create property, navigate to property. */
  createFlow?: "with-report" | "property-only";
};

export function ReportFlowModal({ isOpen, onClose, onComplete, onPropertyCreated, onPropertySelected, startAtCreateProperty, createFlow }: ReportFlowModalProps) {
  const supabase = createClient();
  const [step, setStep] = useState<ReportStep>("select-property");
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | number | null>(null);

  const [createPropertySubStep, setCreatePropertySubStep] = useState<CreatePropertySubStep>("address");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [rooms, setRooms] = useState<RoomFormItem[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const [propertyDetail, setPropertyDetail] = useState<PropertyDetail | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [propertyRooms, setPropertyRooms] = useState<RoomDetail[]>([]);
  const [propertyPhotos, setPropertyPhotos] = useState<Record<string, PhotoDetail[]>>({});
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [roomComplete, setRoomComplete] = useState<Record<string, boolean>>({});
  const [roomCompleteError, setRoomCompleteError] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [photoUploadingFor, setPhotoUploadingFor] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCameraRoomId, setActiveCameraRoomId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [photoStep, setPhotoStep] = useState<"idle" | "preview">("idle");
  const [photoNote, setPhotoNote] = useState("");
  const [previewRoomId, setPreviewRoomId] = useState<string | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<PhotoDetail | null>(null);
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [addRoomSelectedType, setAddRoomSelectedType] = useState<string | null>(null);
  const [addRoomCustomName, setAddRoomCustomName] = useState("");
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState("");
  const [createReportType, setCreateReportType] = useState<string>("check-in");

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        onClose();
        return;
      }
      const { data } = await supabase
        .from("properties")
        .select("id, address_line1, address_line2, city, postcode, property_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setProperties((data ?? []) as Property[]);
      setLoading(false);
    })();
  }, [isOpen, supabase.auth, onClose]);

  useEffect(() => {
    if (isOpen && startAtCreateProperty) {
      setStep("create-property");
      setCreatePropertySubStep("address");
      setCreateReportType("check-in");
    }
  }, [isOpen, startAtCreateProperty]);

  useEffect(() => {
    if (!isOpen) {
      setStep("select-property");
      setCreatePropertySubStep("address");
      setSelectedPropertyId(null);
      setAddressLine1("");
      setCity("");
      setPostcode("");
      setMoveInDate("");
      setPropertyType("");
      setRooms([]);
      setCreateError(null);
      setPropertyDetail(null);
      setPropertyRooms([]);
      setPropertyPhotos({});
      setPhotoUrls({});
      setRoomComplete({});
      setRoomCompleteError(null);
      setDetailsError(null);
      setPreviewFile(null);
      setPreviewDataUrl(null);
      setPhotoStep("idle");
      setPhotoNote("");
      setPreviewRoomId(null);
      setRoomToDelete(null);
      setAddRoomModalOpen(false);
      setAddRoomSelectedType(null);
      setAddRoomCustomName("");
      setEditingRoomId(null);
      setEditingRoomName("");
      setCreateReportType("check-in");
    }
  }, [isOpen]);

  const selectExistingProperty = (property: Property) => {
    if (onPropertySelected) {
      onPropertySelected(property.id);
      onClose();
      return;
    }
    setSelectedPropertyId(property.id);
    setStep("property-details");
  };

  const selectAddNewProperty = () => {
    setSelectedPropertyId(null);
    setCreatePropertySubStep("address");
    setAddressLine1("");
    setCity("");
    setPostcode("");
    setMoveInDate("");
    setPropertyType("");
    setCreateError(null);
    setCreateReportType("check-in");
    setStep("create-property");
  };

  const updateRoom = (id: string, updates: Partial<RoomFormItem>) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const removeRoom = (id: string) => {
    const next = rooms.filter((r) => r.id !== id);
    setRooms(next);
  };

  const addRoom = () => {
    setRooms((prev) => [...prev, { id: generateId(), roomType: "", customName: "" }]);
  };

  const isAddressStepValid = () =>
    Boolean(
      addressLine1.trim() &&
        city.trim() &&
        postcode.trim() &&
        moveInDate.trim() &&
        propertyType
    );

  const handleCreatePropertyOnly = async () => {
    setCreateError(null);
    if (!moveInDate.trim()) {
      setCreateError("Please enter your tenancy start date.");
      return;
    }
    if (!propertyType) {
      setCreateError("Please select a property type.");
      return;
    }
    setCreateLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        onClose();
        return;
      }

      const { data: propertyData, error: propError } = await supabase
        .from("properties")
        .insert({
          user_id: user.id,
          address_line1: toTitleCase(addressLine1.trim()),
          address_line2: null,
          city: city.trim() ? toTitleCase(city.trim()) : null,
          postcode: formatPostcode(postcode),
          tenancy_start_date: moveInDate.trim(),
          property_type: propertyType,
        })
        .select("id")
        .single();

      if (propError) {
        setCreateError(propError.message ?? "Failed to save property.");
        setCreateLoading(false);
        return;
      }

      const address = [
        toTitleCase(addressLine1.trim()),
        city.trim() ? toTitleCase(city.trim()) : null,
        formatPostcode(postcode),
      ]
        .filter(Boolean)
        .join(", ");
      fetch("/api/notify/property-created", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, email: user.email ?? "" }),
      }).catch(() => {});

      if (onPropertyCreated) {
        onPropertyCreated(propertyData.id);
        onClose();
      }
    } catch {
      setCreateError("Something went wrong. Please try again.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreatePropertyAndReport = async () => {
    setCreateError(null);
    if (!moveInDate.trim()) {
      setCreateError("Please enter your tenancy start date.");
      return;
    }
    if (!propertyType) {
      setCreateError("Please select a property type.");
      return;
    }
    setCreateLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        onClose();
        return;
      }

      const { data: propertyData, error: propError } = await supabase
        .from("properties")
        .insert({
          user_id: user.id,
          address_line1: toTitleCase(addressLine1.trim()),
          address_line2: null,
          city: city.trim() ? toTitleCase(city.trim()) : null,
          postcode: formatPostcode(postcode),
          tenancy_start_date: moveInDate.trim(),
          property_type: propertyType,
        })
        .select("id")
        .single();

      if (propError) {
        setCreateError(propError.message ?? "Failed to save property.");
        setCreateLoading(false);
        return;
      }

      const address = [
        toTitleCase(addressLine1.trim()),
        city.trim() ? toTitleCase(city.trim()) : null,
        formatPostcode(postcode),
      ]
        .filter(Boolean)
        .join(", ");
      fetch("/api/notify/property-created", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, email: user.email ?? "" }),
      }).catch(() => {});

      const propertyId = propertyData.id;

      const { data: newReport, error: reportError } = await supabase
        .from("reports")
        .insert({
          property_id: propertyId,
          user_id: user.id,
          status: "in_progress",
          report_type: createReportType,
          storage_path: null,
        })
        .select("id")
        .single();

      if (reportError || !newReport) {
        setCreateError(reportError?.message ?? "Failed to create report.");
        setCreateLoading(false);
        return;
      }

      if (onPropertyCreated) {
        onPropertyCreated(propertyId, newReport.id);
        onClose();
      }
    } catch {
      setCreateError("Something went wrong. Please try again.");
    } finally {
      setCreateLoading(false);
    }
  };

  const detailsLoadedForPropertyRef = useRef<string | number | null>(null);
  useEffect(() => {
    if (step !== "property-details" || !selectedPropertyId) return;
    if (detailsLoadedForPropertyRef.current === selectedPropertyId) return;
    (async () => {
      setDetailsLoading(true);
      setDetailsError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          onClose();
          return;
        }

        const { data: prop, error: propErr } = await supabase
          .from("properties")
          .select("id, address_line1, address_line2, city, postcode, property_type")
          .eq("id", selectedPropertyId)
          .eq("user_id", user.id)
          .single();

        if (propErr || !prop) {
          setDetailsError("Property not found.");
          setDetailsLoading(false);
          return;
        }

        setPropertyDetail(prop as PropertyDetail);

        const { data: inProgressReport } = await supabase
          .from("reports")
          .select("id")
          .eq("property_id", selectedPropertyId)
          .eq("user_id", user.id)
          .eq("status", "in_progress")
          .maybeSingle();

        const roomsList: RoomDetail[] = inProgressReport
          ? ((await supabase
              .from("rooms")
              .select("id, display_name, room_type, custom_name")
              .eq("report_id", inProgressReport.id)
              .eq("user_id", user.id)
              .order("created_at", { ascending: true })).data ?? []) as RoomDetail[]
          : [];

        setPropertyRooms(roomsList);
        setSelectedReportId(inProgressReport ? String(inProgressReport.id) : null);

        const reportIds = inProgressReport ? [inProgressReport.id] : [];
        const { data: photosData } = reportIds.length > 0
          ? await supabase
              .from("photos")
              .select("id, storage_path, room_id")
              .in("report_id", reportIds)
              .eq("user_id", user.id)
              .order("taken_at", { ascending: false })
          : { data: [] as { id: string; storage_path: string; room_id: string }[] };

        const photosByRoom: Record<string, PhotoDetail[]> = {};
        for (const r of roomsList) {
          photosByRoom[String(r.id)] = [];
        }
        for (const p of (photosData ?? []) as PhotoDetail[]) {
          const rid = String(p.room_id);
          if (!photosByRoom[rid]) photosByRoom[rid] = [];
          photosByRoom[rid].push(p);
        }
        setPropertyPhotos(photosByRoom);

        const urlMap: Record<string, string> = {};
        for (const p of (photosData ?? []) as PhotoDetail[]) {
          const { data } = await supabase.storage
            .from("photos")
            .createSignedUrl(p.storage_path, 3600);
          if (data?.signedUrl) urlMap[String(p.id)] = data.signedUrl;
        }
        setPhotoUrls(urlMap);

        setRoomComplete({});
        detailsLoadedForPropertyRef.current = selectedPropertyId;
      } catch {
        setDetailsError("Failed to load property details.");
      } finally {
        setDetailsLoading(false);
      }
    })();
  }, [step, selectedPropertyId, supabase.auth, onClose]);

  const openCameraForRoom = (roomId: string) => {
    setRoomCompleteError(null);
    setActiveCameraRoomId(roomId);
    fileInputRef.current?.click();
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const roomId = activeCameraRoomId;
    if (!roomId || !selectedPropertyId) return;
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
    if (!roomId || !selectedPropertyId || !selectedReportId || !previewFile) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setPhotoUploadingFor(roomId);
    setDetailsError(null);
    try {
      const timestamp = Date.now();
      const storagePath = `${user.id}/${selectedPropertyId}/${roomId}/${timestamp}.jpg`;

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
          report_id: selectedReportId,
          user_id: user.id,
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

      const photo = inserted as PhotoDetail;
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

  const handleDeletePhotoClick = (photo: PhotoDetail) => {
    setPhotoToDelete(photo);
  };

  const handleConfirmDeletePhoto = async () => {
    const photo = photoToDelete;
    if (!photo) return;
    setPhotoToDelete(null);
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

  const handleRoomCompleteChange = (roomId: string, checked: boolean) => {
    setRoomCompleteError(null);
    const photos = propertyPhotos[roomId] ?? [];
    if (checked && photos.length === 0) {
      setRoomCompleteError("Room cannot be marked complete. At least one photo is required.");
      return;
    }
    setRoomComplete((prev) => ({ ...prev, [roomId]: checked }));
  };

  const handleDeleteRoomClick = (roomId: string) => {
    setRoomToDelete(roomId);
  };

  const handleConfirmDeleteRoom = async () => {
    const roomId = roomToDelete;
    if (!roomId || !selectedPropertyId) return;
    if (!selectedReportId) return;
    setDetailsError(null);
    try {
      const photos = propertyPhotos[roomId] ?? [];
      for (const p of photos) {
        await supabase.storage.from("photos").remove([p.storage_path]);
      }
      await supabase.from("photos").delete().eq("room_id", roomId).eq("report_id", selectedReportId);
      const { error } = await supabase.from("rooms").delete().eq("id", roomId).eq("report_id", selectedReportId);
      if (error) {
        setDetailsError(error.message ?? "Failed to delete room.");
        setRoomToDelete(null);
        return;
      }
      setPropertyRooms((prev) => prev.filter((r) => String(r.id) !== roomId));
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
    if (!selectedPropertyId) return;
    if (!selectedReportId) {
      setDetailsError("No report in progress. Start a report from the property page first.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const roomType = addRoomSelectedType;
    if (!roomType) return;
    const isCustom = roomType === "Custom";
    const baseName = isCustom ? addRoomCustomName.trim() || "Custom" : roomType;
    if (isCustom && !addRoomCustomName.trim()) return;

    const sameTypeRooms = propertyRooms.filter((r) =>
      r.room_type === "Custom" ? (r.custom_name || "").trim() === baseName : r.room_type === roomType
    );
    const displayName = `${baseName} ${sameTypeRooms.length + 1}`;

    setDetailsError(null);
    try {
      const { data: newRoom, error } = await supabase
        .from("rooms")
        .insert({
          report_id: selectedReportId,
          user_id: user.id,
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
      setPropertyRooms((prev) => [...prev, newRoom as RoomDetail]);
      setPropertyPhotos((prev) => ({ ...prev, [String(newRoom.id)]: [] }));
      setAddRoomModalOpen(false);
      setAddRoomSelectedType(null);
      setAddRoomCustomName("");
    } catch {
      setDetailsError("Something went wrong.");
    }
  };

  const handleRenameRoomStart = (room: RoomDetail) => {
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
      setPropertyRooms((prev) =>
        prev.map((r) => (String(r.id) === editingRoomId ? { ...r, display_name: trimmed } : r))
      );
    } catch {
      setDetailsError("Something went wrong.");
    } finally {
      setEditingRoomId(null);
      setEditingRoomName("");
    }
  };

  const allRoomsComplete = () => {
    if (propertyRooms.length === 0) return false;
    return propertyRooms.every((r) => roomComplete[String(r.id)]);
  };

  const completedCount = propertyRooms.filter((r) => roomComplete[String(r.id)]).length;

  const isExpanded =
    step === "property-details" ||
    (step === "create-property" && createPropertySubStep === "report-type");

  const flowContent = (
    <div className="relative w-full max-w-[420px] mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoFileChange}
        className="hidden"
        aria-hidden
      />
      {roomToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
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

      {photoToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="relative w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-1" style={fontStyle}>
              Delete Photo
            </h2>
            <p className="text-sm text-gray-500 mb-6" style={fontStyle}>
              Are you sure you want to delete this photo?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="shrink-0 py-2.5 px-5 rounded-lg font-medium text-sm text-white hover:opacity-90 transition-opacity"
                style={{ ...fontStyle, backgroundColor: "#008bff", color: "#ffffff" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePhoto}
                className="flex-1 min-w-0 py-2.5 px-4 rounded-lg font-medium text-sm text-white bg-red-500 hover:bg-red-600 transition-colors"
                style={{ ...fontStyle, color: "#ffffff" }}
              >
                Yes, Delete Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {addRoomModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
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
                {ADD_ROOM_TYPES.map((type) => (
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

      {photoStep === "preview" && previewDataUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 overflow-y-auto overflow-x-hidden">
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
      <AnimatePresence initial={false} mode="wait">
        {step === "select-property" && (
          <motion.div
            key="select-property"
            initial={fadeScaleTransition.initial}
            animate={fadeScaleTransition.animate}
            exit={fadeScaleTransition.exit}
            transition={fadeScaleTransition.transition}
            className="flex flex-col"
          >
            <div className="relative w-full max-w-[480px] rounded-2xl bg-white shadow-xl p-6">
              <h2 className="text-xl font-bold mb-1" style={fontStyle}>Select property</h2>
              <p className="text-sm text-gray-500 mb-4" style={fontStyle}>Choose an existing property or create a new one.</p>

              {properties.length > 0 && (
                <div className="flex flex-col gap-2 mb-4 max-h-[240px] overflow-y-auto">
                  {properties.map((property) => (
                    <button
                      key={property.id}
                      type="button"
                      onClick={() => selectExistingProperty(property)}
                      className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-[#008bff] hover:shadow-md transition-all"
                      style={fontStyle}
                    >
                      <p className="font-semibold text-[#0F172A] text-base">
                        {formatAddress(property) || "Unnamed property"}
                      </p>
                      <p className="text-sm text-[#6B7280] mt-1">
                        {property.property_type ?? "Property"}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={selectAddNewProperty}
                className="w-full bg-[#008bff] text-white rounded-xl py-3 font-medium"
                style={{ ...fontStyle, color: "#ffffff" }}
              >
                + Add New Property
              </button>
            </div>
          </motion.div>
        )}

        {step === "create-property" && (
          <div key="create-property" className="flex flex-col">
            <AnimatePresence initial={false} mode="wait">
              {createPropertySubStep === "address" && (
                <motion.div
                  key="address"
                  initial={fadeScaleTransition.initial}
                  animate={fadeScaleTransition.animate}
                  exit={fadeScaleTransition.exit}
                  transition={fadeScaleTransition.transition}
                  className="flex flex-col"
                >
                  <div className="w-full max-w-[420px] p-5">
                    <h1
                      className="text-[#101827] font-semibold text-xl mb-0.5"
                      style={fontStyle}
                    >
                      Create property
                    </h1>
                    <p className="text-[#6B7280] text-sm mb-3" style={fontStyle}>
                      Enter the property address.
                    </p>

                    <div className="flex flex-col gap-2.5 mb-3">
                      <div>
                        <label className="block text-[#414651] font-medium text-sm mb-0.5" style={fontStyle}>
                          Address Line 1
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            value={addressLine1}
                            onChange={(e) => setAddressLine1(e.target.value)}
                            placeholder="Street address"
                            className={`${inputClass} pl-10`}
                            style={fontStyle}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#414651] font-medium text-sm mb-0.5" style={fontStyle}>
                          City
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="City"
                          className={inputClass}
                          style={fontStyle}
                        />
                      </div>

                      <div>
                        <label className="block text-[#414651] font-medium text-sm mb-0.5" style={fontStyle}>
                          Postcode
                        </label>
                        <input
                          type="text"
                          value={postcode}
                          onChange={(e) => setPostcode(e.target.value)}
                          placeholder="Postcode"
                          className={inputClass}
                          style={fontStyle}
                        />
                      </div>

                      <div>
                        <label className="block text-[#414651] font-medium text-sm mb-0.5" style={fontStyle}>
                          Property Type
                        </label>
                        <select
                          value={propertyType}
                          onChange={(e) => setPropertyType(e.target.value)}
                          className={inputClass}
                          style={fontStyle}
                        >
                          <option value="">Select type</option>
                          {PROPERTY_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#414651] font-medium text-sm mb-0.5" style={fontStyle}>
                          Tenancy Start Date
                        </label>
                        <input
                          type="date"
                          value={moveInDate}
                          onChange={(e) => setMoveInDate(e.target.value)}
                          className={inputClass}
                          style={fontStyle}
                        />
                      </div>
                    </div>

                    {createError && (
                      <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                        {createError}
                      </div>
                    )}

                    {createFlow === "with-report" ? (
                      <button
                        type="button"
                        onClick={() => setCreatePropertySubStep("report-type")}
                        disabled={!isAddressStepValid()}
                        className="w-full py-2 rounded-lg text-white font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 enabled:bg-[#008bff] enabled:hover:bg-[#0077e6] transition-colors flex items-center justify-center gap-2"
                        style={{ ...fontStyle, color: "#ffffff" }}
                      >
                        Next <span aria-hidden>→</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCreatePropertyOnly}
                        disabled={!isAddressStepValid() || createLoading}
                        className="w-full py-2 rounded-lg text-white font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 enabled:bg-[#008bff] enabled:hover:bg-[#0077e6] transition-colors flex items-center justify-center gap-2"
                        style={{ ...fontStyle, color: "#ffffff" }}
                      >
                        {createLoading ? "Creating…" : "Create Property"}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {createPropertySubStep === "report-type" && createFlow === "with-report" && (
                <motion.div
                  key="report-type"
                  initial={fadeScaleTransition.initial}
                  animate={fadeScaleTransition.animate}
                  exit={fadeScaleTransition.exit}
                  transition={fadeScaleTransition.transition}
                  className="flex flex-col"
                >
                  <div className="w-full max-w-[420px] bg-white rounded-2xl p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
                    <h1
                      className="text-[#101827] font-semibold text-xl mb-2"
                      style={fontStyle}
                    >
                      Report type
                    </h1>
                    <p className="text-[#6B7280] text-sm mb-6" style={fontStyle}>
                      Choose the type of report to start.
                    </p>

                    {createError && (
                      <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                        {createError}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 mb-6">
                      {REPORT_TYPES_CREATE.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setCreateReportType(value)}
                          className={`w-full py-3 px-4 rounded-xl border-2 text-left font-medium transition-colors ${
                            createReportType === value
                              ? "border-[#008bff] bg-[#008bff]/5 text-[#008bff]"
                              : "border-gray-200 bg-white text-[#101827] hover:border-gray-300"
                          }`}
                          style={fontStyle}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleCreatePropertyAndReport}
                      disabled={createLoading}
                      className="w-full py-3 rounded-lg text-white font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 enabled:bg-[#008bff] enabled:hover:bg-[#0077e6] transition-colors mb-4"
                      style={{ ...fontStyle, color: "#ffffff" }}
                    >
                      {createLoading ? "Creating…" : "Create & Start Report"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreatePropertySubStep("address")}
                      className="w-full py-2 text-[#008bff] font-medium text-sm hover:underline flex items-center justify-center gap-1"
                      style={fontStyle}
                    >
                      <span aria-hidden>←</span> Back
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {step === "property-details" && (
          <motion.div
            key="property-details"
            initial={fadeScaleTransition.initial}
            animate={fadeScaleTransition.animate}
            exit={fadeScaleTransition.exit}
            transition={fadeScaleTransition.transition}
            className="flex flex-col"
          >
            <div className="w-full max-w-[420px] bg-white rounded-2xl p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
              <h1
                className="text-[#101827] font-semibold text-xl mb-2"
                style={fontStyle}
              >
                Property details
              </h1>
              <p className="text-[#6B7280] text-sm mb-6" style={fontStyle}>
                Add photos to each room and mark complete.
              </p>

              {detailsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-[#008bff] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : propertyDetail ? (
                <>
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

                  <div className="rounded-xl border border-gray-200 p-4 mb-6 bg-gray-50/50">
                    <p className="text-[#414651] font-medium text-sm mb-2" style={fontStyle}>
                      Property Information
                    </p>
                    <p className="text-[#0F172A] font-semibold text-base" style={fontStyle}>
                      {formatAddress(propertyDetail as Property)}
                    </p>
                    <p className="text-[#6B7280] text-sm mt-1">
                      {propertyDetail.property_type ?? "—"} • {propertyRooms.length} room{propertyRooms.length !== 1 ? "s" : ""}
                    </p>
                    {propertyDetail.notes && (
                      <p className="text-[#6B7280] text-sm mt-1">{propertyDetail.notes}</p>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[#414651] font-medium text-sm" style={fontStyle}>
                        Progress
                      </p>
                      <p className="text-[#6B7280] text-sm" style={fontStyle}>
                        {completedCount} of {propertyRooms.length} rooms completed
                      </p>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#008bff] rounded-full transition-all duration-300"
                        style={{
                          width: propertyRooms.length
                            ? `${(completedCount / propertyRooms.length) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 mb-4 max-h-[320px] overflow-y-auto">
                    {propertyRooms.map((room) => {
                      const rid = String(room.id);
                      const photos = propertyPhotos[rid] ?? [];
                      const isComplete = roomComplete[rid];
                      const roomName = room.display_name || room.room_type || "Room";

                      return (
                        <div
                          key={room.id}
                          className="rounded-xl border border-gray-200 p-4 bg-white relative"
                        >
                          <button
                            type="button"
                            onClick={() => handleDeleteRoomClick(rid)}
                            className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
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
                              onClick={() => handleRenameRoomStart(room)}
                              className="font-semibold text-[#0F172A] text-base pr-8 w-full text-left py-0 border-0 bg-transparent cursor-pointer hover:underline"
                              style={fontStyle}
                            >
                              {roomName}
                            </button>
                          )}

                          <div className="grid grid-cols-3 gap-2 my-3">
                            {photos.map((photo) => (
                              <div
                                key={photo.id}
                                className="relative w-full overflow-hidden rounded-lg bg-gray-100"
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
                                <button
                                  type="button"
                                  onClick={() => handleDeletePhotoClick(photo)}
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
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => openCameraForRoom(rid)}
                            disabled={photoUploadingFor === rid}
                            className="w-full py-2.5 rounded-lg bg-[#008bff] text-white font-medium text-sm hover:bg-[#0077e6] flex items-center justify-center gap-2 mb-3"
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

                  <button
                    type="button"
                    onClick={handleAddRoomClick}
                    className="w-full py-2.5 rounded-xl bg-[#008bff] text-white font-medium text-sm hover:bg-[#0077e6] flex items-center justify-center gap-2 mb-6"
                    style={{ ...fontStyle, color: "#ffffff" }}
                  >
                    <span className="text-lg leading-none">＋</span>
                    Add Room
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep("generate")}
                    disabled={!allRoomsComplete()}
                    className="w-full py-3 rounded-lg font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-500 enabled:bg-[#008bff] enabled:text-white enabled:hover:bg-[#0077e6] transition-colors"
                    style={{ ...fontStyle, color: allRoomsComplete() ? "#ffffff" : undefined }}
                  >
                    Finish Report
                  </button>
                </>
              ) : (
                <div className="text-center py-8 text-[#6B7280]">No property selected.</div>
              )}
            </div>
          </motion.div>
        )}

        {step === "generate" && (
          <motion.div
            key="generate"
            initial={fadeScaleTransition.initial}
            animate={fadeScaleTransition.animate}
            exit={fadeScaleTransition.exit}
            transition={fadeScaleTransition.transition}
            className="flex flex-col"
          >
            <div className="w-full max-w-[420px] bg-white rounded-2xl p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
              <h1
                className="text-[#101827] font-semibold text-xl mb-2"
                style={fontStyle}
              >
                Generate report
              </h1>
              <p className="text-[#6B7280] text-sm mb-6" style={fontStyle}>
                Review and generate your report.
              </p>
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-[#6B7280] text-sm mb-6">
                Placeholder: generate report
              </div>
              <button
                type="button"
                onClick={onComplete}
                className="w-full py-3 rounded-lg bg-[#008bff] text-white font-medium text-base hover:bg-[#0077e6]"
                style={{ ...fontStyle, color: "#ffffff" }}
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden
          />
          <motion.div
            className="relative w-full max-w-[480px] rounded-2xl bg-[#F8F8F8] shadow-xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ opacity: { duration: 0.2, ease: "easeOut" }, scale: { duration: 0.2, ease: "easeOut" } }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-200/80 text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="p-5 pt-12">
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#008bff] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                flowContent
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

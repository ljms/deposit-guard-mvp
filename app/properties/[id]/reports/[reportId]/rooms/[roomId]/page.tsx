import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportRoomClient } from "./ReportRoomClient";

export default async function ReportRoomPage({
  params,
}: {
  params: Promise<{ id: string; reportId: string; roomId: string }>;
}) {
  const { id, reportId, roomId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, address_line1, address_line2, city, postcode, property_type, tenancy_start_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (propertyError || !property) {
    notFound();
  }

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, property_id, status, storage_path")
    .eq("id", reportId)
    .eq("user_id", user.id)
    .single();

  if (reportError || !report || String(report.property_id) !== String(id)) {
    notFound();
  }

  const isReportCompleted = report.status === "completed" || Boolean(report.storage_path);

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, display_name, room_type, custom_name, notes, is_complete")
    .eq("id", roomId)
    .eq("property_id", id)
    .eq("user_id", user.id)
    .single();

  if (roomError || !room) {
    notFound();
  }

  const { data: photosData } = await supabase
    .from("photos")
    .select("id, storage_path, room_id, note")
    .eq("property_id", id)
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false });

  return (
    <ReportRoomClient
      userId={user.id}
      reportId={reportId}
      propertyId={id}
      property={property}
      room={room}
      photosData={photosData ?? []}
      isLocked={isReportCompleted}
    />
  );
}

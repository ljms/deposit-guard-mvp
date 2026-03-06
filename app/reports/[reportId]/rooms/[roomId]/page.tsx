import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportRoomWorkspaceClient } from "./ReportRoomWorkspaceClient";

type RoomPageProps = {
  params: Promise<{ reportId: string; roomId: string }>;
};

export default async function ReportRoomPage({ params }: RoomPageProps) {
  const { reportId, roomId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, property_id, status, storage_path")
    .eq("id", reportId)
    .eq("user_id", user.id)
    .single();

  if (reportError || !report) {
    notFound();
  }

  const propertyId = report.property_id;
  const isReportCompleted = report.status === "completed" || Boolean(report.storage_path);

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, display_name, room_type, custom_name, notes, is_complete")
    .eq("id", roomId)
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .single();

  if (roomError || !room) {
    notFound();
  }

  const { data: photosData } = await supabase
    .from("photos")
    .select("id, storage_path, room_id, note")
    .eq("property_id", propertyId)
    .eq("report_id", reportId)
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false });

  return (
    <ReportRoomWorkspaceClient
      userId={user.id}
      reportId={reportId}
      propertyId={String(propertyId)}
      room={room}
      photosData={photosData ?? []}
      isLocked={isReportCompleted}
    />
  );
}

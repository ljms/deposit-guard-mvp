import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportRoomClient } from "../ReportRoomClient";

type RoomPageProps = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ reportId?: string }>;
};

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const { roomId } = await params;
  const { reportId } = await searchParams;

  if (!reportId) {
    redirect("/dashboard");
  }

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
    .eq("report_id", reportId)
    .eq("user_id", user.id)
    .single();

  if (roomError || !room) {
    notFound();
  }

  const { data: photosData } = await supabase
    .from("photos")
    .select("id, storage_path, room_id, note")
    .eq("report_id", reportId)
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false });

  return (
    <ReportRoomClient
      userId={user.id}
      reportId={reportId}
      propertyId={String(propertyId)}
      room={room}
      photosData={photosData ?? []}
      isLocked={isReportCompleted}
    />
  );
}

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoomDetailClient } from "./RoomDetailClient";

type RoomDetailPageProps = {
  params: Promise<{ id: string; roomId: string }>;
};

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const { id: propertyId, roomId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, address_line1, address_line2, city, postcode")
    .eq("id", propertyId)
    .single();

  if (propertyError || !property) {
    notFound();
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, display_name, room_type, custom_name, report_id")
    .eq("id", roomId)
    .eq("user_id", user.id)
    .single();

  if (roomError || !room) {
    notFound();
  }

  const reportId = room.report_id;
  if (!reportId) {
    notFound();
  }

  const { data: photos } = await supabase
    .from("photos")
    .select("id, storage_path, note, taken_at")
    .eq("room_id", roomId)
    .eq("report_id", reportId)
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false });

  const { data: reports } = await supabase
    .from("reports")
    .select("status, storage_path")
    .eq("property_id", propertyId)
    .eq("user_id", user.id);

  const hasCompletedReport = (reports ?? []).some(
    (r) => r.status === "completed" || Boolean(r.storage_path)
  );

  return (
    <RoomDetailClient
      userId={user.id}
      property={property}
      room={{ ...room, report_id: reportId }}
      reportId={reportId}
      isLocked={hasCompletedReport}
      initialPhotos={photos ?? []}
    />
  );
}

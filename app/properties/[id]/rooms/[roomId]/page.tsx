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
    redirect("/login");
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, address_line1, address_line2, city, postcode, is_locked")
    .eq("id", propertyId)
    .single();

  if (propertyError || !property) {
    notFound();
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, display_name, room_type, custom_name, property_id")
    .eq("id", roomId)
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .single();

  if (roomError || !room) {
    notFound();
  }

  const { data: photos } = await supabase
    .from("photos")
    .select("id, storage_path, note, taken_at")
    .eq("room_id", roomId)
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false });

  return (
    <RoomDetailClient
      userId={user.id}
      property={property}
      room={room}
      isLocked={Boolean(property.is_locked)}
      initialPhotos={photos ?? []}
    />
  );
}

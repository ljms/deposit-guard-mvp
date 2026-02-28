import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoomsClient } from "./RoomsClient";

type RoomsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RoomsPage({ params }: RoomsPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, address_line1, address_line2, city, postcode, property_type, is_locked")
    .eq("id", id)
    .single();

  if (propertyError || !property) {
    notFound();
  }

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, room_type, custom_name, display_name, property_id, created_at")
    .eq("property_id", property.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const { count: totalPhotoCount } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("property_id", property.id);

  return (
    <RoomsClient
      userId={user.id}
      property={property}
      initialRooms={rooms ?? []}
      totalPhotoCount={totalPhotoCount ?? 0}
    />
  );
}


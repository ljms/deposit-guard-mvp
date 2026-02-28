import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropertiesClient } from "./PropertiesClient";

export default async function PropertiesPage() {
  // eslint-disable-next-line no-console
  console.log("[properties/page.tsx] Properties page reached");

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    // eslint-disable-next-line no-console
    console.error("[properties/page.tsx] getUser error:", userError);
  }
  if (!user) {
    // eslint-disable-next-line no-console
    console.log("[properties/page.tsx] No user, redirecting to /");
    redirect("/");
  }

  const { data: properties, error: propertiesError } = await supabase
    .from("properties")
    .select("id, address_line1, address_line2, city, postcode, property_type, is_locked, move_in_date")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (propertiesError) {
    // eslint-disable-next-line no-console
    console.error("[properties/page.tsx] properties query error:", propertiesError);
  }

  const propertyIds = (properties ?? []).map((p) => p.id);
  const roomCounts: Record<string, number> = {};

  if (propertyIds.length > 0) {
    const { data: roomData } = await supabase
      .from("rooms")
      .select("property_id")
      .in("property_id", propertyIds)
      .eq("user_id", user.id);

    (roomData ?? []).forEach((r: { property_id: string }) => {
      roomCounts[r.property_id] = (roomCounts[r.property_id] ?? 0) + 1;
    });
  }

  return (
    <PropertiesClient
      properties={properties ?? []}
      roomCounts={roomCounts}
    />
  );
}

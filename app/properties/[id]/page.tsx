import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropertyDetailClient } from "./PropertyDetailClient";

type PropertyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertyPage({ params }: PropertyPageProps) {
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
    .select("id, address_line1, address_line2, city, postcode, property_type, is_locked, move_in_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (propertyError || !property) {
    // eslint-disable-next-line no-console
    console.log("[properties/[id]/page.tsx] notFound() triggered: property fetch failed or returned no row", {
      id,
      propertyError: propertyError?.message ?? propertyError,
      hasProperty: Boolean(property),
    });
    notFound();
  }

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id")
    .eq("property_id", property.id)
    .eq("user_id", user.id);

  const roomCount = rooms?.length ?? 0;

  const { data: reports } = await supabase
    .from("reports")
    .select("id, property_id, storage_path, created_at, status, report_type")
    .eq("property_id", property.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { count: photoCount } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("property_id", property.id);

  return (
    <PropertyDetailClient
      property={property}
      roomCount={roomCount}
      reports={reports ?? []}
      photoCount={photoCount ?? 0}
    />
  );
}

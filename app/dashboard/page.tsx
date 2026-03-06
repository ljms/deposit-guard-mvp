import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: properties, error: propertiesError } = await supabase
    .from("properties")
    .select("id, address_line1, address_line2, city, postcode, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch ALL reports (in_progress and completed) for the user — no status filter
  const { data: reports, error: reportsError } = await supabase
    .from("reports")
    .select("id, property_id, storage_path, created_at, status, report_type")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (propertiesError) {
    console.error("[dashboard/page.tsx] Properties Supabase error:", propertiesError.message, propertiesError);
  }
  if (reportsError) {
    console.error("[dashboard/page.tsx] Reports Supabase error:", reportsError.message, reportsError);
  }

  // Get room counts (bedrooms, bathrooms) and photo counts per report
  const propertyIds = (properties ?? []).map((p) => p.id);
  const roomCounts: Record<string, number> = {};
  const bedroomCounts: Record<string, number> = {};
  const bathroomCounts: Record<string, number> = {};
  const roomsByPropertyId: Record<string, string[]> = {};

  if (propertyIds.length > 0) {
    const roomData = await supabase
      .from("rooms")
      .select("id, property_id, room_type")
      .in("property_id", propertyIds)
      .eq("user_id", user.id);

    (roomData.data ?? []).forEach((r: { id: string; property_id: string; room_type: string }) => {
      roomCounts[r.property_id] = (roomCounts[r.property_id] ?? 0) + 1;
      if (!roomsByPropertyId[r.property_id]) roomsByPropertyId[r.property_id] = [];
      roomsByPropertyId[r.property_id].push(r.id);
      if (r.room_type === "Bedroom") {
        bedroomCounts[r.property_id] = (bedroomCounts[r.property_id] ?? 0) + 1;
      }
      if (r.room_type === "Bathroom" || r.room_type === "Ensuite") {
        bathroomCounts[r.property_id] = (bathroomCounts[r.property_id] ?? 0) + 1;
      }
    });
  }

  const photoCountsByReportId: Record<string, number> = {};
  for (const report of reports ?? []) {
    const roomIds = roomsByPropertyId[String(report.property_id)] ?? [];
    let query = supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("property_id", report.property_id)
      .eq("report_id", report.id);
    if (roomIds.length > 0) {
      query = query.in("room_id", roomIds);
    }
    const { count } = await query;
    photoCountsByReportId[String(report.id)] = count ?? 0;
  }

  const userName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    "there";

  return (
    <DashboardClient
      userName={userName}
      properties={properties ?? []}
      reports={reports ?? []}
      roomCounts={roomCounts}
      bedroomCounts={bedroomCounts}
      bathroomCounts={bathroomCounts}
      photoCountsByReportId={photoCountsByReportId}
    />
  );
}

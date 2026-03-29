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

  const { data: walkthroughProfile, error: walkthroughProfileError } = await supabase
    .from("profiles")
    .select("has_seen_onboarding")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !walkthroughProfileError &&
    walkthroughProfile?.has_seen_onboarding !== true
  ) {
    redirect("/walkthrough");
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
  const reportIds = (reports ?? []).map((r) => r.id);
  const roomCounts: Record<string, number> = {};
  const bedroomCounts: Record<string, number> = {};
  const bathroomCounts: Record<string, number> = {};

  if (reportIds.length > 0) {
    const roomData = await supabase
      .from("rooms")
      .select("id, report_id, room_type")
      .in("report_id", reportIds)
      .eq("user_id", user.id);

    (roomData.data ?? []).forEach((r: { id: string; report_id: string; room_type: string }) => {
      roomCounts[r.report_id] = (roomCounts[r.report_id] ?? 0) + 1;
      if (r.room_type === "Bedroom") {
        bedroomCounts[r.report_id] = (bedroomCounts[r.report_id] ?? 0) + 1;
      }
      if (r.room_type === "Bathroom" || r.room_type === "Ensuite") {
        bathroomCounts[r.report_id] = (bathroomCounts[r.report_id] ?? 0) + 1;
      }
    });
  }

  const photoCountsByReportId: Record<string, number> = {};
  for (const report of reports ?? []) {
    const { count } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("report_id", report.id);
    photoCountsByReportId[String(report.id)] = count ?? 0;
  }

  const userName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    "there";

  const rawAvatar = user.user_metadata?.avatar_url;
  const userAvatarUrl =
    typeof rawAvatar === "string" && rawAvatar.trim() !== "" ? rawAvatar.trim() : null;

  return (
    <DashboardClient
      userName={userName}
      userAvatarUrl={userAvatarUrl}
      properties={properties ?? []}
      reports={reports ?? []}
      roomCounts={roomCounts}
      bedroomCounts={bedroomCounts}
      bathroomCounts={bathroomCounts}
      photoCountsByReportId={photoCountsByReportId}
    />
  );
}

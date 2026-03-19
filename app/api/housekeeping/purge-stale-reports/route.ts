import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { purgeStaleReports } from "@/lib/purgeStaleReports";

export const dynamic = "force-dynamic";

/**
 * Admin-only manual trigger; runs the same purge as GET/POST /api/cron/purge-stale-reports (no CRON_SECRET on client).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  const { data: adminRow } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await purgeStaleReports();
    return NextResponse.json({
      purgedCount: result.purgedCount,
      reportIds: result.reportIds,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Purge failed" },
      { status: 500 }
    );
  }
}

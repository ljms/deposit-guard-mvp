import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendStaleReportWarnings } from "@/lib/sendStaleReportWarnings";

export const dynamic = "force-dynamic";

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
    const result = await sendStaleReportWarnings();
    return NextResponse.json({
      warning48hSent: result.warning48hSent,
      warning24hSent: result.warning24hSent,
      totalSent: result.totalSent,
      reportIds: result.reportIds,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Warning job failed" },
      { status: 500 }
    );
  }
}

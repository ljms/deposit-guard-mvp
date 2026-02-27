import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: Request,
  { params }: { params: { reportId: string } }
) {
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

  const reportId = params.reportId;

  const { data: report, error } = await admin
    .from("reports")
    .select("storage_path, property_id")
    .eq("id", reportId)
    .maybeSingle();

  if (error || !report) {
    return NextResponse.json(
      { message: "Report not found" },
      { status: 404 }
    );
  }

  if (report.storage_path) {
    await admin.storage.from("reports").remove([report.storage_path]);
  }

  await admin.from("reports").delete().eq("id", reportId);

  if (report.property_id) {
    await admin
      .from("properties")
      .update({ is_locked: false })
      .eq("id", report.property_id);
  }

  return NextResponse.json({ success: true });
}


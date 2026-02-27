import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ reportId: string }> }
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

  const { reportId } = await params;

  const { data: report, error } = await admin
    .from("reports")
    .select("storage_path")
    .eq("id", reportId)
    .maybeSingle();

  if (error || !report) {
    return NextResponse.json(
      { message: "Report not found" },
      { status: 404 }
    );
  }

  // Use the regular Supabase client for storage, which is already
  // known to work for signed URLs elsewhere in the app.
  const { data, error: urlError } = await supabase.storage
    .from("reports")
    .createSignedUrl(report.storage_path, 3600);

  if (urlError || !data?.signedUrl) {
    return NextResponse.json(
      { message: "Failed to create signed URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}


import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string; propertyId: string }> }
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

  const { userId, propertyId } = await params;

  try {
    const { data: photos } = await admin
      .from("photos")
      .select("storage_path")
      .eq("user_id", userId)
      .eq("property_id", propertyId);

    const photoPaths =
      photos?.map((p: any) => p.storage_path).filter(Boolean) ?? [];

    if (photoPaths.length > 0) {
      await admin.storage.from("photos").remove(photoPaths);
    }

    const { data: reports } = await admin
      .from("reports")
      .select("storage_path")
      .eq("user_id", userId)
      .eq("property_id", propertyId);

    const reportPaths =
      reports?.map((r: any) => r.storage_path).filter(Boolean) ?? [];

    if (reportPaths.length > 0) {
      await admin.storage.from("reports").remove(reportPaths);
    }

    await admin.from("photos").delete().eq("property_id", propertyId);
    await admin.from("reports").delete().eq("property_id", propertyId);
    await admin.from("rooms").delete().eq("property_id", propertyId);
    await admin.from("properties").delete().eq("id", propertyId);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      {
        message:
          err instanceof Error ? err.message : "Failed to delete property",
      },
      { status: 500 }
    );
  }
}


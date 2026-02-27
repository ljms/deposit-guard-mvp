import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: Request,
  { params }: { params: { userId: string } }
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

  const targetUserId = params.userId;

  try {
    await admin.from("photos").delete().eq("user_id", targetUserId);
    await admin.from("rooms").delete().eq("user_id", targetUserId);
    await admin.from("reports").delete().eq("user_id", targetUserId);
    await admin.from("properties").delete().eq("user_id", targetUserId);
    await admin.from("admin_users").delete().eq("user_id", targetUserId);

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(
      targetUserId
    );

    if (deleteUserError) {
      return NextResponse.json(
        { message: deleteUserError.message || "Failed to delete auth user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      {
        message:
          err instanceof Error ? err.message : "Failed to delete user data",
      },
      { status: 500 }
    );
  }
}


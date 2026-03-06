import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { sendSlackNotification } from "@/lib/slack";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = user.id;

  try {
    // Delete user data (order respects potential FK constraints if no cascade)
    await supabase.from("photos").delete().eq("user_id", userId);
    await supabase.from("rooms").delete().eq("user_id", userId);
    await supabase.from("properties").delete().eq("user_id", userId);

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { message: "Server configuration error. Account data was deleted but auth account could not be removed." },
        { status: 500 }
      );
    }

    const admin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const userEmail = user.email ?? "unknown";
    void sendSlackNotification(`🗑️ Account deleted: ${userEmail}`);

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      return NextResponse.json(
        { message: deleteUserError.message || "Failed to delete auth account." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to delete account." },
      { status: 500 }
    );
  }
}

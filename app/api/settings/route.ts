import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("settings")
    .select("payments_enabled")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { payments_enabled: false },
      { status: 200 }
    );
  }

  return NextResponse.json({
    payments_enabled: Boolean(data.payments_enabled),
  });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  const { data: adminRow } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { payments_enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.payments_enabled !== "boolean") {
    return NextResponse.json(
      { error: "payments_enabled must be a boolean" },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("settings")
    .update({ payments_enabled: body.payments_enabled })
    .eq("id", 1)
    .select("payments_enabled")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Failed to update settings" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    payments_enabled: Boolean(data?.payments_enabled),
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSlackNotification } from "@/lib/slack";

const REPORT_TYPE_LABELS: Record<string, string> = {
  "check-in": "Check-In Report",
  interim: "Interim Report",
  "check-out": "Check-Out Report",
};

function formatAddress(p: { address_line1?: string | null; address_line2?: string | null; city?: string | null; postcode?: string | null }) {
  const parts = [p.address_line1, p.address_line2, p.city, p.postcode].filter(Boolean);
  return parts.join(", ") || "Unknown address";
}

export async function POST(req: Request) {
  try {
    const { reportId } = (await req.json()) as { reportId?: string };
    if (!reportId || typeof reportId !== "string") {
      return NextResponse.json({ ok: true });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: true });

    const { data: report } = await supabase
      .from("reports")
      .select("id, property_id, report_type")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    if (!report) return NextResponse.json({ ok: true });

    const { data: property } = await supabase
      .from("properties")
      .select("address_line1, address_line2, city, postcode")
      .eq("id", report.property_id)
      .eq("user_id", user.id)
      .single();

    const reportTypeLabel = REPORT_TYPE_LABELS[report.report_type ?? "check-in"] ?? report.report_type ?? "Report";
    const address = property ? formatAddress(property) : "Unknown address";

    void sendSlackNotification(`📋 Report completed: ${reportTypeLabel} for ${address} by ${user.email ?? "unknown"}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const reportId = session.metadata?.reportId;
    let reportUserId: string | null = null;

    if (reportId) {
      const admin = getAdminClient();
      const { data: updatedReport } = await admin
        .from("reports")
        .update({
          payment_status: "paid",
          stripe_session_id: session.id,
        })
        .eq("id", reportId)
        .select("user_id")
        .maybeSingle();

      reportUserId = updatedReport?.user_id ?? null;

      if (session.metadata?.bundle === "true") {
        const userId = session.metadata.userId || reportUserId;
        if (userId) {
          const { error } = await admin.rpc("increment_report_credits", {
            user_id: userId,
            amount: 1,
          });
          if (error) console.error("Failed to add report credit:", error);
        }
      }
    }
  }

  return new NextResponse(null, { status: 200 });
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { STRIPE_PRICES } from "@/app/lib/stripe-prices";

export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

export async function POST(req: Request) {
  if (!stripeSecretKey || !appUrl) {
    return NextResponse.json(
      { error: "Stripe or app URL not configured" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { reportId?: string; priceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reportId = body.reportId;
  const priceId = body.priceId;
  if (!reportId || typeof reportId !== "string") {
    return NextResponse.json({ error: "reportId required" }, { status: 400 });
  }
  if (!priceId || typeof priceId !== "string") {
    return NextResponse.json({ error: "priceId required" }, { status: 400 });
  }
  if (priceId !== STRIPE_PRICES.single && priceId !== STRIPE_PRICES.double) {
    return NextResponse.json({ error: "Invalid priceId" }, { status: 400 });
  }

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, user_id, payment_status")
    .eq("id", reportId)
    .eq("user_id", user.id)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.payment_status === "paid") {
    return NextResponse.json({ alreadyPaid: true });
  }

  const stripe = new Stripe(stripeSecretKey);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/reports/${reportId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/reports/${reportId}`,
    metadata:
      priceId === STRIPE_PRICES.double
        ? { reportId, priceId, bundle: "true" }
        : { reportId, priceId },
  });

  const { error: updateError } = await supabase
    .from("reports")
    .update({ stripe_session_id: session.id })
    .eq("id", reportId)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to save session" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: session.url ?? undefined,
  });
}

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendSlackNotification } from "@/lib/slack";

const CORS_ORIGIN = "https://depositguard.com";

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

type ContactPayload = {
  name?: string;
  email?: string;
  message?: string;
  recaptcha_token?: string;
  source?: string;
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders() });
}

export async function POST(req: Request) {
  const headers = corsHeaders();

  try {
    let payload: ContactPayload;
    try {
      payload = (await req.json()) as ContactPayload;
    } catch {
      return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers });
    }

    const { name, email, message, recaptcha_token, source } = payload;

    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    if (!recaptchaSecret) {
      return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers });
    }

    const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: recaptchaSecret,
        response: recaptcha_token ?? "",
      }),
    });

    let verifyData: { success?: boolean };
    try {
      verifyData = (await verifyRes.json()) as { success?: boolean };
    } catch {
      return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers });
    }

    if (!verifyData.success) {
      return NextResponse.json({ error: "reCAPTCHA verification failed" }, { status: 400, headers });
    }

    const supabase = getAdminClient();
    const { error: insertError } = await supabase.from("contact_submissions").insert({
      name: name ?? "",
      email: email ?? "",
      message: message ?? "",
      source: source ?? null,
    });

    if (insertError) {
      console.error("[contact] Supabase insert failed:", insertError);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers });
    }

    void sendSlackNotification(
      `📬 Contact form (depositguard.com)\nName: ${name ?? ""}\nEmail: ${email ?? ""}\nSource: ${source ?? "—"}\nMessage:\n${message ?? ""}`
    );

    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch (err) {
    console.error("[contact] Unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers });
  }
}

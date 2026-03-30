import { NextResponse } from "next/server";
import { createElement } from "react";
import { Resend } from "resend";
import ContactConfirmationEmail from "@/emails/ContactConfirmationEmail";
import { getAdminClient } from "@/lib/supabase/admin";

const ALLOWED_ORIGINS = ["https://depositguard.com", "https://www.depositguard.com"];

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

type ContactPayload = {
  name?: string;
  email?: string;
  message?: string;
  subject?: string;
  recaptcha_token?: string;
  source?: string;
};

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  const headers = corsHeaders(req);

  try {
    let payload: ContactPayload;
    try {
      payload = (await req.json()) as ContactPayload;
    } catch {
      return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers });
    }

    const { name, email, message, subject, recaptcha_token, source } = payload;

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

    const slackContactUrl = process.env.SLACK_CONTACT_WEBHOOK_URL;
    if (slackContactUrl) {
      await fetch(slackContactUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `📬 Contact form (depositguard.com)\nName: ${name ?? ""}\nEmail: ${email ?? ""}\nSource: ${source ?? "—"}\nMessage:\n${message ?? ""}`,
        }),
      });
    }

    const trimmedContactEmail = (email ?? "").trim();
    const confirmationName = (name ?? "").trim() || "there";
    const confirmationSubject =
      (typeof subject === "string" && subject.trim()) ||
      (typeof source === "string" && source.trim()) ||
      "Contact form";
    const confirmationMessage = message ?? "";

    if (trimmedContactEmail) {
      try {
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
          const resend = new Resend(apiKey);
          const sendResult = await resend.emails.send({
            from: "Deposit Guard <noreply@depositguard.com>",
            to: trimmedContactEmail,
            subject: "We've received your message",
            react: createElement(ContactConfirmationEmail, {
              name: confirmationName,
              subject: confirmationSubject,
              message: confirmationMessage,
            }),
          });
          if (sendResult.error) {
            console.error("[contact] Auto-reply Resend error:", sendResult.error.message);
          }
        }
      } catch (err) {
        console.error("[contact] Auto-reply failed:", err);
      }
    }

    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch (err) {
    console.error("[contact] Unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers });
  }
}

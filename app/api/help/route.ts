import { NextResponse } from "next/server";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { sendSlackNotification } from "@/lib/slack";
import { getResendClient } from "@/lib/resend";
import ContactConfirmationEmail from "@/emails/ContactConfirmationEmail";

type HelpPayload = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: HelpPayload;
  try {
    payload = (await req.json()) as HelpPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? user.email ?? "").trim();
  const subject = (payload.subject ?? "").trim();
  const message = (payload.message ?? "").trim();

  if (!name || !email || !subject || !message) {
    return NextResponse.json(
      { error: "Please complete all fields." },
      { status: 400 }
    );
  }

  if (message.length > 1000) {
    return NextResponse.json(
      { error: "Message must be 1000 characters or less." },
      { status: 400 }
    );
  }

  void sendSlackNotification(
    `🆘 Help request\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`
  );

  try {
    const resend = getResendClient();
    const sendResult = await resend.emails.send({
      from: "Deposit Guard <noreply@depositguard.com>",
      to: email,
      subject: "We've received your message",
      react: createElement(ContactConfirmationEmail, { name, subject, message }),
    });
    if (sendResult.error) {
      return NextResponse.json({ error: sendResult.error.message }, { status: 500 });
    }

    const adminSubject = `New help request: ${subject.replace(/\r?\n/g, " ")}`;
    const adminText = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Subject: ${subject}`,
      "",
      "Message:",
      message,
    ].join("\n");
    const adminHtml = `<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
<p><strong>Name:</strong> ${escapeHtml(name)}</p>
<p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
<p><strong>Message:</strong></p>
<p style="white-space:pre-wrap;margin:0;">${escapeHtml(message)}</p>
</div>`;

    const adminSendResult = await resend.emails.send({
      from: "Deposit Guard <noreply@depositguard.com>",
      to: "luke@depositguard.com",
      subject: adminSubject,
      text: adminText,
      html: adminHtml,
    });
    if (adminSendResult.error) {
      return NextResponse.json({ error: adminSendResult.error.message }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send confirmation email." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

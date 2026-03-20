import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSlackNotification } from "@/lib/slack";
import { getResendClient } from "@/lib/resend";

type HelpPayload = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
};

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
      text:
        "We've received your message and will get back to you shortly.\n\nThanks,\nDeposit Guard",
      html:
        "<div style=\"font-family:Arial,sans-serif;color:#111827;\"><p>We&apos;ve received your message and will get back to you shortly.</p><p>Thanks,<br/>Deposit Guard</p></div>",
    });
    if (sendResult.error) {
      return NextResponse.json({ error: sendResult.error.message }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send confirmation email." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

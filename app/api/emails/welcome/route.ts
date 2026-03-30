import { NextResponse } from "next/server";
import { createElement } from "react";
import { Resend } from "resend";
import WelcomeEmail from "@/emails/WelcomeEmail";

type WelcomeBody = {
  email?: string;
  userName?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }

  let body: WelcomeBody;
  try {
    body = (await req.json()) as WelcomeBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const userName = typeof body.userName === "string" ? body.userName.trim() : undefined;

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  const sendResult = await resend.emails.send({
    from: "Deposit Guard <noreply@depositguard.com>",
    to: email,
    subject: "Welcome to Deposit Guard",
    react: createElement(WelcomeEmail, { userName }),
  });

  if (sendResult.error) {
    return NextResponse.json({ error: sendResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

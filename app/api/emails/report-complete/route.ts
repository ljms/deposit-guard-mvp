import { NextResponse } from "next/server";
import { createElement } from "react";
import { Resend } from "resend";
import ReportCompleteEmail from "@/emails/ReportCompleteEmail";

type ReportCompleteBody = {
  email?: string;
  userName?: string;
  propertyAddress?: string;
  roomCount?: number;
  photoCount?: number;
  generatedDate?: string;
  reportUrl?: string;
  pdfUrl?: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }

  let body: ReportCompleteBody;
  try {
    body = (await req.json()) as ReportCompleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const userName =
    typeof body.userName === "string" && body.userName.trim() ? body.userName.trim() : undefined;
  const propertyAddress = typeof body.propertyAddress === "string" ? body.propertyAddress.trim() : "";
  const roomCount = typeof body.roomCount === "number" && Number.isFinite(body.roomCount) ? body.roomCount : NaN;
  const photoCount =
    typeof body.photoCount === "number" && Number.isFinite(body.photoCount) ? body.photoCount : NaN;
  const generatedDate = typeof body.generatedDate === "string" ? body.generatedDate.trim() : "";
  const reportUrl = typeof body.reportUrl === "string" ? body.reportUrl.trim() : "";
  const pdfUrl = typeof body.pdfUrl === "string" ? body.pdfUrl.trim() : "";

  if (!isNonEmptyString(email) || !isNonEmptyString(propertyAddress)) {
    return NextResponse.json({ error: "Valid email and propertyAddress are required" }, { status: 400 });
  }
  if (!isNonEmptyString(reportUrl) || !isNonEmptyString(pdfUrl)) {
    return NextResponse.json({ error: "Valid reportUrl and pdfUrl are required" }, { status: 400 });
  }
  if (Number.isNaN(roomCount) || Number.isNaN(photoCount) || roomCount < 0 || photoCount < 0) {
    return NextResponse.json({ error: "Valid roomCount and photoCount are required" }, { status: 400 });
  }
  if (!generatedDate) {
    return NextResponse.json({ error: "generatedDate is required" }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  const sendResult = await resend.emails.send({
    from: "Deposit Guard <noreply@depositguard.com>",
    to: email,
    subject: "Your Deposit Guard report is ready",
    react: createElement(ReportCompleteEmail, {
      userName,
      propertyAddress,
      roomCount,
      photoCount,
      generatedDate,
      reportUrl,
      pdfUrl,
    }),
  });

  if (sendResult.error) {
    return NextResponse.json({ error: sendResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

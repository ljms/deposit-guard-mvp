import { NextResponse } from "next/server";
import { sendSlackNotification } from "@/lib/slack";

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: true });
    }
    void sendSlackNotification(`🔐 User logged in: ${email}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

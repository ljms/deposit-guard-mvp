import { NextResponse } from "next/server";
import { sendSlackNotification } from "@/lib/slack";

export async function POST(req: Request) {
  try {
    const { address, email } = (await req.json()) as { address?: string; email?: string };
    if (!address || !email || typeof address !== "string" || typeof email !== "string") {
      return NextResponse.json({ ok: true });
    }
    void sendSlackNotification(`🏠 New property created: ${address} by ${email}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

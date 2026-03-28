import { getAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SEC = 60;

async function enforceCheckEmailRateLimit(req: Request): Promise<NextResponse | null> {
  const base = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) {
    return null;
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const key = `rate_limit:check-email:${ip}`;
  const encKey = encodeURIComponent(key);
  const root = base.replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${token}` };

  const incrRes = await fetch(`${root}/incr/${encKey}`, { headers });
  if (!incrRes.ok) {
    return null;
  }

  const incrBody = (await incrRes.json()) as { result?: number | string };
  const raw = incrBody.result;
  const count =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseInt(raw, 10) || 0
        : 0;

  if (count === 1) {
    await fetch(`${root}/expire/${encKey}/${RATE_LIMIT_WINDOW_SEC}`, { headers });
  }

  if (count > RATE_LIMIT_MAX) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  return null;
}

export async function POST(req: Request) {
  const rateLimited = await enforceCheckEmailRateLimit(req);
  if (rateLimited) {
    return rateLimited;
  }

  const { email } = await req.json();
  const admin = getAdminClient();
  const { data } = await admin.auth.admin.listUsers();
  const exists = data.users.some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  return NextResponse.json({ exists });
}

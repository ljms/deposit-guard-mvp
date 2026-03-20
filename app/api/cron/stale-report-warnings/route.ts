import { NextResponse } from "next/server";
import { sendStaleReportWarnings } from "@/lib/sendStaleReportWarnings";

export const dynamic = "force-dynamic";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function handleWarnings() {
  const result = await sendStaleReportWarnings();
  return NextResponse.json({
    warning48hSent: result.warning48hSent,
    warning24hSent: result.warning24hSent,
    totalSent: result.totalSent,
    reportIds: result.reportIds,
  });
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return await handleWarnings();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Warning job failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return await handleWarnings();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Warning job failed" },
      { status: 500 }
    );
  }
}

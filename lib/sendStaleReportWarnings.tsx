import { StaleReport24hEmail } from "@/emails/stale-report-24h";
import { StaleReport48hEmail } from "@/emails/stale-report-48h";
import { getResendClient } from "@/lib/resend";
import { sendSlackNotification } from "@/lib/slack";
import { getAdminClient } from "@/lib/supabase/admin";

export type SendStaleWarningsResult = {
  warning48hSent: number;
  warning24hSent: number;
  totalSent: number;
  reportIds: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

type ReportRow = {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string | null;
  warning_48h_sent_at: string | null;
  warning_24h_sent_at: string | null;
};

type PropertyRow = {
  id: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
};

function formatAddress(property: PropertyRow | null | undefined): string {
  if (!property) return "Unknown property";
  const parts = [
    property.address_line1,
    property.address_line2,
    property.city,
    property.postcode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Unknown property";
}

export async function sendStaleReportWarnings(): Promise<SendStaleWarningsResult> {
  const admin = getAdminClient();
  const resend = getResendClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL");
  }

  const { data: reportsData, error: reportsError } = await admin
    .from("reports")
    .select(
      "id, user_id, property_id, created_at, warning_48h_sent_at, warning_24h_sent_at"
    )
    .eq("status", "in_progress")
    .or("payment_status.is.null,payment_status.neq.paid");

  if (reportsError) {
    throw new Error(reportsError.message);
  }

  const reports = (reportsData ?? []) as ReportRow[];
  if (reports.length === 0) {
    return { warning48hSent: 0, warning24hSent: 0, totalSent: 0, reportIds: [] };
  }

  const propertyIds = Array.from(new Set(reports.map((r) => r.property_id)));
  const { data: propertiesData, error: propertiesError } = await admin
    .from("properties")
    .select("id, address_line1, address_line2, city, postcode")
    .in("id", propertyIds);

  if (propertiesError) {
    throw new Error(propertiesError.message);
  }

  const propertyById = new Map<string, PropertyRow>(
    ((propertiesData ?? []) as PropertyRow[]).map((p) => [p.id, p])
  );

  let warning48hSent = 0;
  let warning24hSent = 0;
  const sentReportIds: string[] = [];
  const nowMs = Date.now();

  for (const report of reports) {
    if (!report.created_at) continue;

    const createdMs = new Date(report.created_at).getTime();
    if (Number.isNaN(createdMs)) continue;
    const ageMs = nowMs - createdMs;

    const in48hWindow = ageMs >= 5 * DAY_MS && ageMs < 6 * DAY_MS;
    const in24hWindow = ageMs >= 6 * DAY_MS && ageMs < 7 * DAY_MS;

    if (!in48hWindow && !in24hWindow) continue;

    const emailLookup = await admin.auth.admin.getUserById(report.user_id);
    const userEmail = emailLookup.data.user?.email;
    if (!userEmail) continue;

    const reportLink = `${appUrl}/reports/${report.id}`;
    const propertyAddress = formatAddress(propertyById.get(report.property_id));

    if (in48hWindow && !report.warning_48h_sent_at) {
      const sendResult = await resend.emails.send({
        from: "Deposit Guard <noreply@depositguard.com>",
        to: userEmail,
        subject: "Your report will be deleted in 48 hours",
        react: (
          <StaleReport48hEmail
            propertyAddress={propertyAddress}
            reportLink={reportLink}
            hoursRemaining={48}
          />
        ),
      });
      if (sendResult.error) {
        throw new Error(sendResult.error.message);
      }

      const { error: update48hError } = await admin
        .from("reports")
        .update({ warning_48h_sent_at: new Date().toISOString() })
        .eq("id", report.id);
      if (update48hError) {
        throw new Error(update48hError.message);
      }
      warning48hSent += 1;
      sentReportIds.push(report.id);
      continue;
    }

    if (in24hWindow && !report.warning_24h_sent_at) {
      const sendResult = await resend.emails.send({
        from: "Deposit Guard <noreply@depositguard.com>",
        to: userEmail,
        subject: "Your report will be deleted in 24 hours",
        react: (
          <StaleReport24hEmail
            propertyAddress={propertyAddress}
            reportLink={reportLink}
            hoursRemaining={24}
          />
        ),
      });
      if (sendResult.error) {
        throw new Error(sendResult.error.message);
      }

      const { error: update24hError } = await admin
        .from("reports")
        .update({ warning_24h_sent_at: new Date().toISOString() })
        .eq("id", report.id);
      if (update24hError) {
        throw new Error(update24hError.message);
      }
      warning24hSent += 1;
      sentReportIds.push(report.id);
    }
  }

  const totalSent = warning48hSent + warning24hSent;
  if (totalSent > 0) {
    void sendSlackNotification(
      `📨 Stale report warnings sent: ${totalSent} total (48h: ${warning48hSent}, 24h: ${warning24hSent}). Report IDs: ${sentReportIds.join(", ")}`
    );
  }

  return {
    warning48hSent,
    warning24hSent,
    totalSent,
    reportIds: sentReportIds,
  };
}

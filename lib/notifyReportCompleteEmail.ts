/**
 * Fire-and-forget client request to send the report-complete transactional email.
 * Does not throw; logs fetch/network failures only.
 */
export type NotifyReportCompleteEmailArgs = {
  reportId: string;
  pdfUrl: string;
  propertyAddress: string;
  roomCount: number;
  photoCount: number;
  completedAtIso: string | null | undefined;
  userEmail: string;
  userName?: string;
};

function formatGeneratedDate(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function notifyReportCompleteEmailClient(args: NotifyReportCompleteEmailArgs): void {
  if (typeof window === "undefined") return;
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    window.location.origin;
  const reportUrl = `${appBase}/r/${args.reportId}`;
  const generatedDate = formatGeneratedDate(args.completedAtIso);
  void fetch(`${window.location.origin}/api/emails/report-complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: args.userEmail,
      userName: args.userName,
      propertyAddress: args.propertyAddress,
      roomCount: args.roomCount,
      photoCount: args.photoCount,
      generatedDate,
      reportUrl,
      pdfUrl: args.pdfUrl,
    }),
  }).catch((err) => {
    console.error("[notifyReportCompleteEmailClient]", err);
  });
}

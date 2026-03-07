import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportWorkspaceClient } from "./ReportWorkspaceClient";

type ReportPageProps = {
  params: Promise<{ reportId: string }>;
};

type ReportPagePropsWithSearch = ReportPageProps & {
  searchParams?: Promise<{ payment?: string }>;
};

export default async function ReportPage({ params, searchParams }: ReportPagePropsWithSearch) {
  const { reportId } = await params;
  const resolvedSearchParams = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, property_id, status, storage_path, report_type, completed_at, checkout_date_local, movein_date_local, payment_status")
    .eq("id", reportId)
    .eq("user_id", user.id)
    .single();

  if (reportError || !report) {
    notFound();
  }

  const propertyId = report.property_id;

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, address_line1, address_line2, city, postcode, property_type, tenancy_start_date")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .single();

  if (propertyError || !property) {
    notFound();
  }

  const isReportCompleted = report.status === "completed" || Boolean(report.storage_path);

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, display_name, room_type, custom_name, is_complete")
    .eq("report_id", reportId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const { data: photosData } = await supabase
    .from("photos")
    .select("id, storage_path, room_id, note")
    .eq("report_id", reportId)
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false });

  return (
    <ReportWorkspaceClient
      userId={user.id}
      reportId={reportId}
      property={property}
      reportCompleted={isReportCompleted}
      reportType={report?.report_type ?? null}
      completedAt={report?.completed_at ?? null}
      checkoutAtLocal={report?.checkout_date_local ?? null}
      moveinDateLocal={report?.movein_date_local ?? null}
      paymentStatus={report?.payment_status ?? "unpaid"}
      rooms={rooms ?? []}
      photosData={photosData ?? []}
      paymentSuccessFromUrl={resolvedSearchParams?.payment === "success" || (Array.isArray(resolvedSearchParams?.payment) && resolvedSearchParams.payment.includes("success"))}
    />
  );
}

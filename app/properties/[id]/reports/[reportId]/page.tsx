import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportWorkspaceClient } from "./ReportWorkspaceClient";

type ReportPageProps = {
  params: Promise<{ id: string; reportId: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { id, reportId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, address_line1, address_line2, city, postcode, property_type, tenancy_start_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (propertyError || !property) {
    notFound();
  }

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, property_id, status, storage_path, report_type, completed_at, checkout_date_local, movein_date_local")
    .eq("id", reportId)
    .eq("user_id", user.id)
    .single();

  if (reportError || !report || String(report.property_id) !== String(id)) {
    notFound();
  }

  const isReportCompleted = report.status === "completed" || Boolean(report.storage_path);

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, display_name, room_type, custom_name")
    .eq("property_id", property.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const { data: photosData } = await supabase
    .from("photos")
    .select("id, storage_path, room_id, note")
    .eq("property_id", property.id)
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
      rooms={rooms ?? []}
      photosData={photosData ?? []}
    />
  );
}

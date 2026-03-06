import { getAdminClient } from "@/lib/supabase/admin";
import { ReportPublicClient } from "./ReportPublicClient";

type PublicReportPageProps = {
  params: Promise<{ reportId: string }>;
};

export default async function PublicReportPage({ params }: PublicReportPageProps) {
  const { reportId } = await params;

  const supabase = getAdminClient();

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, property_id, status, report_type, completed_at, checkout_date_local, movein_date_local, created_at")
    .eq("id", reportId)
    .single();

  if (reportError || !report || report.status !== "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-gray-600 text-center">This report is not available.</p>
      </div>
    );
  }

  const propertyId = report.property_id;

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, address_line1, address_line2, city, postcode, property_type, tenancy_start_date")
    .eq("id", propertyId)
    .single();

  if (propertyError || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-gray-600 text-center">This report is not available.</p>
      </div>
    );
  }

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, display_name, room_type, custom_name, notes")
    .eq("property_id", property.id)
    .order("created_at", { ascending: true });

  const { data: photosData } = await supabase
    .from("photos")
    .select("id, storage_path, room_id, note, taken_at")
    .eq("property_id", property.id)
    .eq("report_id", reportId)
    .order("taken_at", { ascending: true });

  const photosWithUrls: { id: string; room_id: string; note: string | null; taken_at: string | null; signedUrl: string }[] = [];

  for (const p of photosData ?? []) {
    const { data: signed } = await supabase.storage
      .from("photos")
      .createSignedUrl(p.storage_path, 3600);
    if (signed?.signedUrl) {
      photosWithUrls.push({
        id: p.id,
        room_id: p.room_id,
        note: p.note ?? null,
        taken_at: p.taken_at ?? null,
        signedUrl: signed.signedUrl,
      });
    }
  }

  return (
    <ReportPublicClient
      reportId={reportId}
      property={property}
      report={report}
      rooms={rooms ?? []}
      photosWithUrls={photosWithUrls}
    />
  );
}

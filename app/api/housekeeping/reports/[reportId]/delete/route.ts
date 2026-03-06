import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  // eslint-disable-next-line no-console
  console.log("[housekeeping/delete-report] POST handler start", { params });

  const supabase = await createClient();
  // eslint-disable-next-line no-console
  console.log("[housekeeping/delete-report] Supabase client created");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // eslint-disable-next-line no-console
  console.log("[housekeeping/delete-report] Auth user fetched", {
    userId: user?.id,
  });

  if (!user) {
    // eslint-disable-next-line no-console
    console.log("[housekeeping/delete-report] No authenticated user");
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  // eslint-disable-next-line no-console
  console.log("[housekeeping/delete-report] Admin client obtained");

  const { data: adminRow } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  // eslint-disable-next-line no-console
  console.log("[housekeeping/delete-report] Admin check result", { adminRow });

  if (!adminRow) {
    // eslint-disable-next-line no-console
    console.log("[housekeeping/delete-report] User is not admin", {
      userId: user.id,
    });
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { reportId } = await params;
  // eslint-disable-next-line no-console
  console.log("[housekeeping/delete-report] Params parsed", { reportId });

  const { data: report, error } = await admin
    .from("reports")
    .select("storage_path, property_id")
    .eq("id", reportId)
    .maybeSingle();
  // eslint-disable-next-line no-console
  console.log("[housekeeping/delete-report] Report fetch result", {
    reportId,
    report,
    error,
  });

  if (error || !report) {
    // eslint-disable-next-line no-console
    console.log(
      "[housekeeping/delete-report] Report fetch error or missing report",
      { reportId, error, report }
    );
    return NextResponse.json(
      { message: "Report not found" },
      { status: 404 }
    );
  }

  if (report.storage_path) {
    const { data: removeData, error: removeError } = await admin.storage
      .from("reports")
      .remove([report.storage_path]);
    // eslint-disable-next-line no-console
    console.log("[housekeeping/delete-report] Storage remove result", {
      reportId,
      storagePath: report.storage_path,
      removeData,
      removeError,
    });
    if (removeError) {
      return NextResponse.json(
        { message: "Failed to remove report file from storage" },
        { status: 500 }
      );
    }
  }

  // Delete only photos belonging to this report (report_id = reportId). Never delete by room_id alone.
  const { data: deletedPhotos, error: photosDeleteError } = await admin
    .from("photos")
    .delete()
    .eq("report_id", reportId)
    .select("id");

  if (photosDeleteError) {
    // eslint-disable-next-line no-console
    console.log("[housekeeping/delete-report] Photos delete error", {
      reportId,
      photosDeleteError,
    });
    return NextResponse.json(
      { message: "Failed to delete report photos" },
      { status: 500 }
    );
  }

  const deletedPhotoCount = deletedPhotos?.length ?? 0;
  // eslint-disable-next-line no-console
  console.log(
    "[housekeeping/delete-report] Deleted photos for report before removing report record",
    { reportId, deletedPhotoCount }
  );

  const { error: deleteError } = await admin
    .from("reports")
    .delete()
    .eq("id", reportId);
  // eslint-disable-next-line no-console
  console.log("[housekeeping/delete-report] DB delete result", {
    reportId,
    deleteError,
  });
  if (deleteError) {
    return NextResponse.json(
      { message: "Failed to delete report record" },
      { status: 500 }
    );
  }

  // eslint-disable-next-line no-console
  console.log("[housekeeping/delete-report] Success", { reportId });
  return NextResponse.json({ success: true });
}


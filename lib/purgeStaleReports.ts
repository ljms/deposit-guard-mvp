import { getAdminClient } from "@/lib/supabase/admin";
import { sendSlackNotification } from "@/lib/slack";

export type PurgeStaleReportsResult = {
  purgedCount: number;
  reportIds: string[];
};

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Deletes incomplete, unpaid reports older than 7 days: photos (storage + rows), rooms, report row.
 */
export async function purgeStaleReports(): Promise<PurgeStaleReportsResult> {
  const admin = getAdminClient();
  const cutoffIso = new Date(Date.now() - STALE_MS).toISOString();

  const { data: staleReports, error: queryError } = await admin
    .from("reports")
    .select("id")
    .eq("status", "in_progress")
    .or("payment_status.is.null,payment_status.neq.paid")
    .lt("created_at", cutoffIso);

  if (queryError) {
    throw new Error(queryError.message);
  }

  const reportIds = (staleReports ?? []).map((r: { id: string }) => String(r.id));

  if (reportIds.length === 0) {
    return { purgedCount: 0, reportIds: [] };
  }

  for (const reportId of reportIds) {
    const { data: photos, error: photosFetchError } = await admin
      .from("photos")
      .select("storage_path")
      .eq("report_id", reportId);

    if (photosFetchError) {
      throw new Error(photosFetchError.message);
    }

    const photoPaths = (photos ?? [])
      .map((p: { storage_path: string | null }) => p.storage_path)
      .filter((p): p is string => Boolean(p));

    if (photoPaths.length > 0) {
      const { error: removePhotosError } = await admin.storage.from("photos").remove(photoPaths);
      if (removePhotosError) {
        throw new Error(removePhotosError.message);
      }
    }

    const { error: photosDeleteError } = await admin.from("photos").delete().eq("report_id", reportId);
    if (photosDeleteError) {
      throw new Error(photosDeleteError.message);
    }

    const { error: roomsDeleteError } = await admin.from("rooms").delete().eq("report_id", reportId);
    if (roomsDeleteError) {
      throw new Error(roomsDeleteError.message);
    }

    const { error: reportDeleteError } = await admin.from("reports").delete().eq("id", reportId);
    if (reportDeleteError) {
      throw new Error(reportDeleteError.message);
    }
  }

  void sendSlackNotification(
    `🧹 Purged ${reportIds.length} stale report(s) (>7d, in progress, unpaid): ${reportIds.join(", ")}`
  );

  return { purgedCount: reportIds.length, reportIds };
}

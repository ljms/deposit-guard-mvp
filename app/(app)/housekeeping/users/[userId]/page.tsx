import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type Report = {
  id: string;
  storage_path: string;
  created_at: string;
};

export type Property = {
  id: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  property_type: string | null;
  hasCompletedReport: boolean;
  created_at: string;
  reports: Report[];
};

export type UserSummary = {
  id: string;
  email: string;
  createdAt: string | null;
};

async function getUserData(userId: string) {
  const admin = getAdminClient();

  const { data: userRecord } = await admin.auth.admin.getUserById(userId);

  const [{ data: propertiesData }, { data: reportsData }] = await Promise.all([
    admin
      .from("properties")
      .select("id, address_line1, address_line2, city, postcode, property_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("reports")
      .select("id, property_id, storage_path, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const properties = Array.isArray(propertiesData) ? propertiesData : [];
  const reports = Array.isArray(reportsData) ? reportsData : [];

  const reportsByProperty = new Map<string, Report[]>();
  reports.forEach((r: any) => {
    const list = reportsByProperty.get(r.property_id) ?? [];
    list.push({
      id: r.id,
      storage_path: r.storage_path,
      created_at: r.created_at,
    });
    reportsByProperty.set(r.property_id, list);
  });

  const propertiesWithReports: Property[] = properties.map((p: any) => {
    const propReports = reportsByProperty.get(p.id) ?? [];
    const hasCompletedReport = propReports.some((r: any) => Boolean(r.storage_path));
    return {
      id: p.id,
      address_line1: p.address_line1,
      address_line2: p.address_line2,
      city: p.city,
      postcode: p.postcode,
      property_type: p.property_type,
      hasCompletedReport,
      created_at: p.created_at,
      reports: propReports,
    };
  });

  return {
    user: {
      id: userId,
      email: userRecord.user?.email ?? "",
      createdAt: userRecord.user?.created_at ?? null,
    } as UserSummary,
    properties: propertiesWithReports,
  };
}

import { HousekeepingUserDetailClient } from "./HousekeepingUserDetailClient";

export default async function HousekeepingUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { user, properties } = await getUserData(userId);

  return <HousekeepingUserDetailClient user={user} properties={properties} />;
}


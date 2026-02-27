import { getAdminClient } from "@/lib/supabase/admin";
import { HousekeepingClient } from "./HousekeepingClient";

export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  email: string;
  createdAt: string | null;
  propertyCount: number;
  reportCount: number;
};

async function getDashboardData() {
  const admin = getAdminClient();

  const [{ data: properties }, { data: reports }] = await Promise.all([
    admin.from("properties").select("id, user_id"),
    admin.from("reports").select("id, user_id"),
  ]);

  const { data: usersResult } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const users = usersResult?.users ?? [];

  const propertyCounts = new Map<string, number>();
  const reportCounts = new Map<string, number>();

  properties?.forEach((p: any) => {
    propertyCounts.set(p.user_id, (propertyCounts.get(p.user_id) ?? 0) + 1);
  });

  reports?.forEach((r: any) => {
    reportCounts.set(r.user_id, (reportCounts.get(r.user_id) ?? 0) + 1);
  });

  const rows: UserRow[] = users.map((u: any) => ({
    id: u.id,
    email: u.email ?? "",
    createdAt: u.created_at ?? null,
    propertyCount: propertyCounts.get(u.id) ?? 0,
    reportCount: reportCounts.get(u.id) ?? 0,
  }));

  return {
    totalUsers: rows.length,
    totalProperties: properties?.length ?? 0,
    totalReports: reports?.length ?? 0,
    users: rows,
  };
}

export default async function HousekeepingPage() {
  const { totalUsers, totalProperties, totalReports, users } =
    await getDashboardData();

  return (
    <HousekeepingClient
      totalUsers={totalUsers}
      totalProperties={totalProperties}
      totalReports={totalReports}
      users={users}
    />
  );
}


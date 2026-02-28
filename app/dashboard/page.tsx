import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: properties } = await supabase
    .from("properties")
    .select("id, address_line1, city, postcode, is_locked")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: reports } = await supabase
    .from("reports")
    .select("property_id, storage_path, created_at")
    .eq("user_id", user.id);

  return (
    <DashboardClient
      properties={properties ?? []}
      reports={reports ?? []}
    />
  );
}


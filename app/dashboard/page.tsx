import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: properties } = await supabase
    .from("properties")
    .select("id, address_line1, city, postcode")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <DashboardClient properties={properties ?? []} />;
}


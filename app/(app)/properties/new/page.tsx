import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewPropertyClient } from "./NewPropertyClient";

export default async function NewPropertyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <NewPropertyClient />;
}


import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWalkthrough } from "@/components/OnboardingWalkthrough";

export default async function WalkthroughPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("has_seen_onboarding")
    .eq("id", user.id)
    .maybeSingle();

  if (!profileError && profile?.has_seen_onboarding === true) {
    redirect("/dashboard");
  }

  return <OnboardingWalkthrough />;
}

import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/AppLayout";

export default async function AuthenticatedGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userDisplayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    user?.email?.split("@")[0] ||
    "";

  const rawAvatar = user?.user_metadata?.avatar_url;
  const userAvatarUrl =
    typeof rawAvatar === "string" && rawAvatar.trim() !== "" ? rawAvatar.trim() : null;

  return (
    <AppLayout userDisplayName={userDisplayName} userAvatarUrl={userAvatarUrl}>
      {children}
    </AppLayout>
  );
}

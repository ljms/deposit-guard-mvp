import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/?error=auth_callback", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("terms_accepted")
    .eq("id", user.id)
    .maybeSingle();

  const needsOnboarding =
    profile == null || profile.terms_accepted !== true;

  const redirectUrl = needsOnboarding
    ? new URL("/onboarding", request.url)
    : new URL("/dashboard", request.url);
  return NextResponse.redirect(redirectUrl);
}

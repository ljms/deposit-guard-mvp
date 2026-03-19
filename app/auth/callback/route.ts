import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { sendSlackNotification } from "@/lib/slack";

/** First OAuth session: created_at and last_sign_in_at are set together (within a short window). */
function isLikelyNewOAuthSignup(createdAt: string | undefined, lastSignInAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  const last = lastSignInAt ? new Date(lastSignInAt).getTime() : created;
  return Math.abs(last - created) < 60_000;
}

export async function GET(request: Request) {
  console.log("[auth/callback] full request URL:", request.url);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  console.log("[auth/callback] code param found:", !!code);

  if (!code) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/?error=auth_callback", request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "pkce",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore cookie errors in route handler
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  console.log("[auth/callback] exchangeCodeForSession error:", error ?? "(none)");

  if (error) {
    return NextResponse.redirect(new URL("/?error=auth_callback", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("[auth/callback] user after exchange:", user ?? "(null)");
  if (!user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const email = user.email;
  if (email) {
    const isNewSignup = isLikelyNewOAuthSignup(user.created_at, user.last_sign_in_at);
    void sendSlackNotification(
      isNewSignup ? `👤 New user registered: ${email}` : `🔐 User logged in: ${email}`
    );
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

"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toTitleCase } from "@/lib/format";
import {
  handleLegalExternalLinkClick,
  LEGAL_PRIVACY_URL,
  LEGAL_TERMS_URL,
} from "@/lib/legal-external-links";
import { AuthDesktopMobileBanner } from "@/components/auth/AuthDesktopMobileBanner";

const fontClass = "font-[family-name:var(--font-poppins),Poppins,sans-serif]";

const inputClassName =
  "w-full rounded-[0.375rem] border border-white/[0.12] bg-white/[0.06] py-[0.55rem] px-[1rem] text-[0.875rem] !text-white placeholder:text-white/30 focus:border-[#008bff] focus:outline-none focus:ring-0 [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgba(255,255,255,0.06)] [&:-webkit-autofill]:[-webkit-text-fill-color:#fff] [&:-webkit-autofill]:[color:white]";

const labelClassName = "text-[0.8rem] font-medium text-white";

const primaryBtnClass =
  "w-full rounded-[0.375rem] bg-[#008bff] py-[0.6rem] text-[0.875rem] font-semibold !text-white disabled:opacity-50";

const googleBtnClass =
  "flex w-full items-center justify-center gap-2 rounded-[0.375rem] border border-[rgba(0,0,0,0.12)] bg-white py-[0.6rem] text-[0.875rem] font-medium text-[#3c4043]";

const stepTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: "easeInOut" as const },
};

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailPrefilledFromQuery = useRef(false);
  const supabase = createClient();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [phase, setPhase] = useState<"form" | "verify" | "welcome">("form");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.replace("/dashboard");
        return;
      }
      setCheckingAuth(false);
    })();
  }, [router, supabase.auth]);

  useEffect(() => {
    if (emailPrefilledFromQuery.current) return;
    const raw = searchParams.get("email");
    if (!raw) return;
    const next = raw.trim();
    if (!next) return;
    setEmail(next);
    emailPrefilledFromQuery.current = true;
  }, [searchParams]);

  const handleGoogleSignIn = () => {
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
      },
    });
  };

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please double-check and try again.");
      return;
    }
    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: (name.trim() && toTitleCase(name.trim())) || undefined } },
      });
      if (signUpError) {
        setError(signUpError.message || "Unable to create your account. Please try again.");
        setLoading(false);
        return;
      }
      if (signUpData?.user) {
        await supabase
          .from("profiles")
          .update({
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
          })
          .eq("id", signUpData.user.id);
        try {
          const siteBase = process.env.NEXT_PUBLIC_SITE_URL || "https://app.depositguard.com";
          const welcomeRes = await fetch(`${siteBase}/api/emails/welcome`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.trim(),
              userName: (name.trim() && toTitleCase(name.trim())) || undefined,
            }),
          });
          if (!welcomeRes.ok) {
            console.error("[signup] welcome email API failed:", welcomeRes.status, await welcomeRes.text());
          }
        } catch (welcomeErr) {
          console.error("[signup] welcome email fetch failed:", welcomeErr);
        }
      }
      fetch("/api/notify/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => {});
      setPhase("verify");
    } catch {
      setError("Something went wrong while creating your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div
        className={`flex min-h-[100dvh] w-full items-center justify-center bg-[#292929] ${fontClass}`}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-[0.125rem] border-[#008bff] border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] w-full bg-[#292929] text-white md:bg-transparent ${fontClass}`}>
      <div className="flex min-h-[100dvh] flex-col md:flex-row">
        <div className="relative flex min-h-[100dvh] flex-1 flex-col bg-[#141922] px-12 pb-10 pt-10 md:w-1/2 md:border-r md:border-solid md:border-white/[0.08] md:px-16">
          <Image
            src="/dg-logo-light.png"
            alt="Deposit Guard"
            width={240}
            height={78}
            priority
            className="absolute left-6 top-6 z-10 h-auto w-[6.5rem] object-contain md:left-8"
          />

          <div className="flex min-h-0 flex-1 flex-col justify-center">
            <div className="mx-auto w-full max-w-[28rem] max-[640px]:mt-4">
              <AnimatePresence mode="wait">
                {phase === "form" ? (
                  <motion.div
                    key="form"
                    initial={stepTransition.initial}
                    animate={stepTransition.animate}
                    exit={stepTransition.exit}
                    transition={stepTransition.transition}
                  >
                    <h1 className="mb-4 text-[1.75rem] font-medium leading-tight md:text-[2rem]">
                      Create account
                    </h1>
                    <p className="text-[0.9rem] text-white/[0.6]">
                      Register with Google or your email to get started.
                    </p>

                    {error && (
                      <div
                        className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-[0.875rem] text-red-200"
                        role="alert"
                      >
                        {error}
                      </div>
                    )}

                    <button type="button" onClick={handleGoogleSignIn} className={`${googleBtnClass} mt-3`}>
                      <GoogleIcon />
                      Continue with Google
                    </button>

                    <div className="mt-3 flex items-center gap-3">
                      <span className="h-[0.0625rem] flex-1 bg-white/[0.1]" aria-hidden />
                      <span className="text-[0.8rem] text-white/40">or</span>
                      <span className="h-[0.0625rem] flex-1 bg-white/[0.1]" aria-hidden />
                    </div>

                    <form onSubmit={handleSignup} className="mt-3 flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="signup-name" className={labelClassName}>
                          Name
                        </label>
                        <input
                          id="signup-name"
                          type="text"
                          autoComplete="name"
                          maxLength={40}
                          value={name}
                          onChange={(e) => setName(e.target.value.replace(/\d/g, ""))}
                          className={inputClassName}
                          placeholder="Your name"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="signup-email" className={labelClassName}>
                          Email
                        </label>
                        <input
                          id="signup-email"
                          type="email"
                          autoComplete="email"
                          required
                          maxLength={254}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={inputClassName}
                          placeholder="you@example.com"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="signup-password" className={labelClassName}>
                          Password
                        </label>
                        <input
                          id="signup-password"
                          type="password"
                          autoComplete="new-password"
                          required
                          maxLength={72}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={inputClassName}
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="signup-confirm" className={labelClassName}>
                          Confirm password
                        </label>
                        <input
                          id="signup-confirm"
                          type="password"
                          autoComplete="new-password"
                          required
                          maxLength={72}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={inputClassName}
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="flex items-start gap-2">
                        <input
                          id="signup-terms"
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-[0.125rem] h-4 w-4 shrink-0 rounded border-white/30 bg-white/[0.06] text-[#008bff] focus:ring-[#008bff]"
                        />
                        <label htmlFor="signup-terms" className="text-[0.875rem] text-white/[0.6]">
                          I agree to the{" "}
                          <a
                            href={LEGAL_TERMS_URL}
                            onClick={(e) => handleLegalExternalLinkClick(e)}
                            className="!text-white/[0.6] underline underline-offset-2"
                          >
                            Terms of Service
                          </a>{" "}
                          and{" "}
                          <a
                            href={LEGAL_PRIVACY_URL}
                            onClick={(e) => handleLegalExternalLinkClick(e)}
                            className="!text-white/[0.6] underline underline-offset-2"
                          >
                            Privacy Policy
                          </a>
                        </label>
                      </div>
                      <button
                        type="submit"
                        disabled={loading || !name.trim() || !email.trim() || !password || !termsAccepted}
                        className={primaryBtnClass}
                      >
                        {loading ? "Creating account…" : "Create account"}
                      </button>
                    </form>

                    <p className="mt-8 text-center text-[0.8rem] text-white/50 md:text-left">
                      Already have an account?{" "}
                      <Link href="/login" className="font-medium text-[#008bff] hover:underline">
                        Log in
                      </Link>
                    </p>
                  </motion.div>
                ) : phase === "verify" ? (
                  <motion.div
                    key="verify"
                    initial={stepTransition.initial}
                    animate={stepTransition.animate}
                    exit={stepTransition.exit}
                    transition={stepTransition.transition}
                  >
                    <h1 className="mb-4 text-[1.75rem] font-medium leading-tight md:text-[2rem]">
                      Check your email
                    </h1>
                    <p className="text-[0.9rem] text-white/[0.6]">
                      We&apos;ve sent a verification link to your email address. Click the link to verify your
                      account.
                    </p>
                    <button
                      type="button"
                      onClick={() => setPhase("welcome")}
                      className={`${primaryBtnClass} mt-3`}
                    >
                      I&apos;ve verified my email
                    </button>
                    <Link
                      href="/login"
                      className="mt-6 inline-block text-[0.875rem] font-medium text-[#008bff] hover:underline"
                    >
                      Back to log in
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div
                    key="welcome"
                    initial={stepTransition.initial}
                    animate={stepTransition.animate}
                    exit={stepTransition.exit}
                    transition={stepTransition.transition}
                  >
                    <h1 className="mb-4 text-[1.75rem] font-medium leading-tight md:text-[2rem]">
                      Welcome aboard
                    </h1>
                    <p className="text-[0.9rem] text-white/[0.6]">
                      You&apos;re all set. Start protecting your deposit today.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        router.replace("/dashboard");
                        router.refresh();
                      }}
                      className={`${primaryBtnClass} mt-3`}
                    >
                      Get started
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <footer className="mt-auto pt-8 text-center text-[0.75rem] text-white/[0.4] md:pt-10 md:text-left">
            <a
              href={LEGAL_TERMS_URL}
              onClick={(e) => handleLegalExternalLinkClick(e)}
              className="!text-white/[0.4] hover:text-white/60"
            >
              Terms of Service
            </a>
            <span className="mx-2 text-white/30" aria-hidden>
              ·
            </span>
            <a
              href={LEGAL_PRIVACY_URL}
              onClick={(e) => handleLegalExternalLinkClick(e)}
              className="!text-white/[0.4] hover:text-white/60"
            >
              Privacy Policy
            </a>
          </footer>
        </div>

        {/* Right column — hidden below md; grab-your-phone message only at lg+ */}
        <div
          className="auth-right-panel hidden min-h-[100dvh] flex-1 bg-[#0d1117] md:block"
          data-slot="right-panel"
        >
          <div className="hidden min-h-[100dvh] w-full items-center justify-center p-10 lg:flex">
            <AuthDesktopMobileBanner />
          </div>
        </div>
      </div>
    </div>
  );
}

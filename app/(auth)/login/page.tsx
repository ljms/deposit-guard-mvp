"use client";

import { useEffect, useState, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  handleLegalExternalLinkClick,
  LEGAL_PRIVACY_POLICY_URL,
  LEGAL_TERMS_URL,
} from "@/lib/legal-external-links";

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

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [view, setView] = useState<"login" | "forgot">("login");
  const [flowStep, setFlowStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmailLoading, setCheckEmailLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

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

  const handleGoogleSignIn = () => {
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
      },
    });
  };

  const handleCheckEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    setEmail(trimmed);
    if (!trimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setCheckEmailLoading(true);
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        setCheckEmailLoading(false);
        return;
      }
      const data = (await res.json()) as { exists?: boolean };
      if (!data.exists) {
        router.push(`/signup?email=${encodeURIComponent(trimmed)}`);
        setCheckEmailLoading(false);
        return;
      }
      setFlowStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setCheckEmailLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message || "Unable to log in. Please check your details and try again.");
        setLoading(false);
        return;
      }
      fetch("/api/notify/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      }).catch(() => {});
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong while trying to log you in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: "https://testing.depositguard.com",
      });
      if (err) {
        setResetError(err.message || "Something went wrong. Please try again.");
        setResetLoading(false);
        return;
      }
      setResetSuccess(true);
    } catch {
      setResetError("Something went wrong. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const openForgot = () => {
    setResetError(null);
    setResetSuccess(false);
    setResetEmail(email.trim());
    setView("forgot");
  };

  const backToStep1 = () => {
    setFlowStep(1);
    setPassword("");
    setError(null);
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
        {/* Left column */}
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
            <div className="mx-auto w-full max-w-[28rem]">
              {view === "login" ? (
                <AnimatePresence mode="wait">
                  {flowStep === 1 ? (
                    <motion.div
                      key="step1"
                      initial={stepTransition.initial}
                      animate={stepTransition.animate}
                      exit={stepTransition.exit}
                      transition={stepTransition.transition}
                    >
                      <h1 className="mb-4 text-[1.75rem] font-medium leading-tight md:text-[2rem]">
                        Log in
                      </h1>
                      <p className="text-[0.9rem] text-white/[0.6]">Enter your email to continue.</p>

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

                      <form onSubmit={handleCheckEmail} className="mt-3 flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="login-email" className={labelClassName}>
                            Email
                          </label>
                          <input
                            id="login-email"
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
                        <button type="submit" disabled={checkEmailLoading} className={primaryBtnClass}>
                          {checkEmailLoading ? "Continuing…" : "Continue"}
                        </button>
                      </form>

                      <p className="mt-8 text-center text-[0.8rem] text-white/50 md:text-left">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="font-medium text-[#008bff] hover:underline">
                          Sign up
                        </Link>
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="step2"
                      initial={stepTransition.initial}
                      animate={stepTransition.animate}
                      exit={stepTransition.exit}
                      transition={stepTransition.transition}
                    >
                      <h1 className="mb-4 text-[1.75rem] font-medium leading-tight md:text-[2rem]">
                        Log in
                      </h1>
                      <p className="text-[0.9rem] text-white/[0.6]">Enter your password to sign in.</p>

                      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.875rem]">
                        <span className="text-white/[0.85]">{email.trim()}</span>
                        <button
                          type="button"
                          onClick={backToStep1}
                          className="font-medium text-[#008bff] hover:underline"
                        >
                          Change
                        </button>
                      </div>

                      {error && (
                        <div
                          className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-[0.875rem] text-red-200"
                          role="alert"
                        >
                          {error}
                        </div>
                      )}

                      <form onSubmit={handleLogin} className="mt-3 flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="login-password" className={labelClassName}>
                            Password
                          </label>
                          <input
                            id="login-password"
                            type="password"
                            autoComplete="current-password"
                            required
                            maxLength={72}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputClassName}
                            placeholder="••••••••"
                          />
                        </div>
                        <button type="submit" disabled={loading} className={primaryBtnClass}>
                          {loading ? "Signing in…" : "Sign in"}
                        </button>
                      </form>

                      <button
                        type="button"
                        onClick={openForgot}
                        className="mt-6 text-[0.875rem] font-medium text-[#008bff] hover:underline md:text-left"
                      >
                        Forgot password?
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : (
                <>
                  <h1 className="mb-4 text-[1.75rem] font-bold leading-tight md:text-[2rem]">
                    Reset your password
                  </h1>
                  <p className="text-[0.9rem] text-white/[0.6]">
                    We&apos;ll email you a link to choose a new password.
                  </p>

                  {resetError && (
                    <div
                      className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-[0.875rem] text-red-200"
                      role="alert"
                    >
                      {resetError}
                    </div>
                  )}

                  {resetSuccess ? (
                    <p className="mt-3 text-[0.9rem] text-white/[0.6]">
                      Check your inbox — we&apos;ve sent you a password reset link.
                    </p>
                  ) : (
                    <form onSubmit={handleResetPassword} className="mt-3 flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="reset-email" className={labelClassName}>
                          Email
                        </label>
                        <input
                          id="reset-email"
                          type="email"
                          autoComplete="email"
                          required
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className={inputClassName}
                          placeholder="you@example.com"
                        />
                      </div>
                      <button type="submit" disabled={resetLoading} className={primaryBtnClass}>
                        {resetLoading ? "Sending…" : "Send reset link"}
                      </button>
                    </form>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setView("login");
                      setResetError(null);
                      setResetSuccess(false);
                    }}
                    className="mt-6 text-[0.875rem] font-medium text-[#008bff] hover:underline"
                  >
                    Back to log in
                  </button>
                </>
              )}
            </div>
          </div>

          <footer className="mt-auto pt-8 text-center text-[0.75rem] text-white/[0.4] md:pt-10 md:text-left">
            <a
              href={LEGAL_TERMS_URL}
              onClick={(e) => handleLegalExternalLinkClick(e, LEGAL_TERMS_URL)}
              className="!text-white/[0.4] hover:text-white/60"
            >
              Terms &amp; Conditions
            </a>
            <span className="mx-2 text-white/30" aria-hidden>
              ·
            </span>
            <a
              href={LEGAL_PRIVACY_POLICY_URL}
              onClick={(e) => handleLegalExternalLinkClick(e, LEGAL_PRIVACY_POLICY_URL)}
              className="!text-white/[0.4] hover:text-white/60"
            >
              Privacy Policy
            </a>
          </footer>
        </div>

        {/* Right column — desktop only */}
        <div
          className="hidden min-h-[100dvh] flex-1 bg-[#0d1117] md:block"
          data-slot="right-panel"
          aria-hidden
        />
      </div>

    </div>
  );
}

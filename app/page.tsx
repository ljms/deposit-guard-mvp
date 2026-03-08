"use client";

import { useEffect, useState, FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toTitleCase } from "@/lib/format";

type AuthScreen = "login" | "signup" | "verify" | "welcome" | "forgotPassword";

const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };
const inputClass =
  "w-full py-2.5 px-3 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] text-base outline-none focus:border-[#008BFF] focus:ring-2 focus:ring-[#008BFF]/20";
const labelClass = "text-[#414651] font-medium text-sm";
const cardClass =
  "w-full max-w-[420px] bg-white rounded-2xl p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]";
const btnPrimaryClass =
  "w-full py-3 rounded-lg bg-[#008BFF] !text-white font-medium text-base hover:bg-[#0077E6] disabled:opacity-70 disabled:cursor-not-allowed transition-colors shadow-[0px_2px_5px_rgba(9,94,159,0.22)]";

const fadeScaleTransition = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.2, ease: "easeInOut" as const },
};

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [screen, setScreen] = useState<AuthScreen>("login");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

  const goTo = (next: AuthScreen) => {
    setError(null);
    setResetError(null);
    if (next !== "forgotPassword") setResetSuccess(false);
    if (next === "forgotPassword") setResetEmail(email);
    setScreen(next);
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

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
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
        body: JSON.stringify({ email }),
      }).catch(() => {});
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong while trying to log you in. Please try again.");
    } finally {
      setLoading(false);
    }
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
      }
      fetch("/api/notify/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => {});
      goTo("verify");
    } catch {
      setError("Something went wrong while creating your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8F8F8]">
        <div className="w-8 h-8 border-2 border-[#008BFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="relative w-full max-w-[420px]">
          <AnimatePresence initial={false} mode="wait">
          {screen === "login" && (
            <motion.div
              key="login"
              initial={fadeScaleTransition.initial}
              animate={fadeScaleTransition.animate}
              exit={fadeScaleTransition.exit}
              transition={fadeScaleTransition.transition}
              className="flex flex-col"
            >
              <div className={cardClass}>
                <div className="flex justify-center mb-7">
                  <Image
                    src="/dg-logo-dark.png"
                    alt="Deposit Guard"
                    width={211}
                    height={69}
                    priority
                    className="object-contain"
                  />
                </div>
                <h1
                  className="text-[#101827] font-semibold text-xl leading-[1.8] mb-6"
                  style={fontStyle}
                >
                  Log in to your account
                </h1>
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                    {error}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] font-medium text-base hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  style={fontStyle}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
                <div className="flex items-center gap-3">
                  <span className="flex-1 h-px bg-[#E5E7EB]" aria-hidden />
                  <span className="text-[#6B7280] text-sm" style={fontStyle}>or</span>
                  <span className="flex-1 h-px bg-[#E5E7EB]" aria-hidden />
                </div>
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="auth-email" className={labelClass} style={fontStyle}>
                      Email
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      style={fontStyle}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="auth-password" className={labelClass} style={fontStyle}>
                      Password
                    </label>
                    <input
                      id="auth-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      style={fontStyle}
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#008BFF] text-[#008BFF] focus:ring-[#008BFF]"
                    />
                    <span className="text-[#6B7280] text-sm" style={fontStyle}>
                      Remember me
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={loading}
                    className={btnPrimaryClass}
                    style={{ ...fontStyle, color: "#ffffff" }}
                  >
                    {loading ? "Signing in…" : "Sign In"}
                  </button>
                </form>
                <div className="mt-6 flex flex-col items-center gap-4">
                  <button
                    type="button"
                    onClick={() => goTo("forgotPassword")}
                    className="text-[#008BFF] font-medium text-xs hover:underline"
                    style={fontStyle}
                  >
                    Forgot Password
                  </button>
                  <p className="text-[#6B7280] text-sm" style={fontStyle}>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => goTo("signup")}
                      className="text-[#008BFF] font-medium hover:underline"
                    >
                      Create account
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {screen === "forgotPassword" && (
            <motion.div
              key="forgotPassword"
              initial={fadeScaleTransition.initial}
              animate={fadeScaleTransition.animate}
              exit={fadeScaleTransition.exit}
              transition={fadeScaleTransition.transition}
              className="flex flex-col"
            >
              <div className={cardClass}>
                <div className="flex justify-center mb-7">
                  <Image
                    src="/dg-logo-dark.png"
                    alt="Deposit Guard"
                    width={211}
                    height={69}
                    priority
                    className="object-contain"
                  />
                </div>
                <h1
                  className="text-[#101827] font-semibold text-xl leading-[1.8] mb-6"
                  style={fontStyle}
                >
                  Reset your password
                </h1>
                {resetError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                    {resetError}
                  </div>
                )}
                {resetSuccess ? (
                  <>
                    <p
                      className="mb-6 text-[#414651] text-sm"
                      style={fontStyle}
                    >
                      Check your inbox — we&apos;ve sent you a password reset link.
                    </p>
                    <button
                      type="button"
                      onClick={() => goTo("login")}
                      className="text-[#008BFF] font-medium text-sm hover:underline"
                      style={fontStyle}
                    >
                      Back to Login
                    </button>
                  </>
                ) : (
                  <>
                    <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="reset-email"
                          className={labelClass}
                          style={fontStyle}
                        >
                          Email
                        </label>
                        <input
                          id="reset-email"
                          type="email"
                          autoComplete="email"
                          required
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className={inputClass}
                          style={fontStyle}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={resetLoading}
                        className={btnPrimaryClass}
                        style={{ ...fontStyle, color: "#ffffff" }}
                      >
                        {resetLoading ? "Sending…" : "Send Reset Link"}
                      </button>
                    </form>
                    <p className="mt-6 text-center">
                      <button
                        type="button"
                        onClick={() => goTo("login")}
                        className="text-[#008BFF] font-medium text-sm hover:underline"
                        style={fontStyle}
                      >
                        Back to Login
                      </button>
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {screen === "signup" && (
            <motion.div
              key="signup"
              initial={fadeScaleTransition.initial}
              animate={fadeScaleTransition.animate}
              exit={fadeScaleTransition.exit}
              transition={fadeScaleTransition.transition}
              className="flex flex-col"
            >
              <div className={cardClass}>
                <div className="flex justify-center mb-7">
                  <Image
                    src="/dg-logo-dark.png"
                    alt="Deposit Guard"
                    width={211}
                    height={69}
                    priority
                    className="object-contain"
                  />
                </div>
                <h1
                  className="text-[#101827] font-semibold text-xl leading-[1.8] mb-6"
                  style={fontStyle}
                >
                  Register your account
                </h1>
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                    {error}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] font-medium text-base hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  style={fontStyle}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
                <div className="flex items-center gap-3">
                  <span className="flex-1 h-px bg-[#E5E7EB]" aria-hidden />
                  <span className="text-[#6B7280] text-sm" style={fontStyle}>or</span>
                  <span className="flex-1 h-px bg-[#E5E7EB]" aria-hidden />
                </div>
                <form onSubmit={handleSignup} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="auth-name" className={labelClass} style={fontStyle}>
                      Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      maxLength={40}
                      value={name}
                      onChange={(e) => setName(e.target.value.replace(/\d/g, ""))}
                      className={inputClass}
                      style={fontStyle}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="signup-email" className={labelClass} style={fontStyle}>
                      Email
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      style={fontStyle}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="signup-password" className={labelClass} style={fontStyle}>
                      Password
                    </label>
                    <input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      style={fontStyle}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="auth-confirm" className={labelClass} style={fontStyle}>
                      Confirm Password
                    </label>
                    <input
                      id="auth-confirm"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputClass}
                      style={fontStyle}
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <input
                      id="auth-terms"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-[#008BFF] text-[#008BFF] focus:ring-[#008BFF]"
                    />
                    <label htmlFor="auth-terms" className="text-[#414651] text-sm" style={fontStyle}>
                      I agree to the{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setTermsModalOpen(true);
                        }}
                        className="text-[#008bff] font-medium hover:underline"
                      >
                        Terms &amp; Conditions
                      </button>
                      {" "}and{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setPrivacyModalOpen(true);
                        }}
                        className="text-[#008bff] font-medium hover:underline"
                      >
                        Privacy Policy
                      </button>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !name.trim() || !email.trim() || !password || !termsAccepted}
                    className="w-full py-3 rounded-lg font-medium text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-500 enabled:bg-[#008bff] enabled:text-white enabled:hover:bg-[#0077e6]"
                    style={{ ...fontStyle, color: "#ffffff" }}
                  >
                    {loading ? "Creating account…" : "Create account"}
                  </button>
                </form>
                <p className="mt-6 text-center text-[#6B7280] text-sm" style={fontStyle}>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => goTo("login")}
                    className="text-[#008BFF] font-medium hover:underline"
                  >
                    Log in
                  </button>
                </p>
              </div>

              {termsModalOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                  onClick={() => setTermsModalOpen(false)}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="terms-title"
                >
                  <div
                    className="w-full max-w-[420px] max-h-[80vh] flex flex-col bg-white rounded-2xl shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2 id="terms-title" className="text-[#101827] font-semibold text-xl p-6 pb-0" style={fontStyle}>
                      Terms &amp; Conditions
                    </h2>
                    <div className="p-6 overflow-y-auto flex-1 text-[#414651] text-sm" style={fontStyle}>
                      These Terms &amp; Conditions are a placeholder and will be updated before launch. By using Deposit Guard, you agree to use the platform responsibly and in accordance with UK law.
                    </div>
                    <div className="p-6 pt-0">
                      <button
                        type="button"
                        onClick={() => setTermsModalOpen(false)}
                        className="w-full py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] font-medium text-base hover:bg-gray-50 transition-colors"
                        style={fontStyle}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {privacyModalOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                  onClick={() => setPrivacyModalOpen(false)}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="privacy-title"
                >
                  <div
                    className="w-full max-w-[420px] max-h-[80vh] flex flex-col bg-white rounded-2xl shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2 id="privacy-title" className="text-[#101827] font-semibold text-xl p-6 pb-0" style={fontStyle}>
                      Privacy Policy
                    </h2>
                    <div className="p-6 overflow-y-auto flex-1 text-[#414651] text-sm space-y-4" style={fontStyle}>

                      <p>This Privacy Policy explains how Deposit Guard ("Deposit Guard", "we", "us", "our") collects, uses, stores, and shares your personal data when you use our website and mobile web application (the "Service").</p>
                      <p>Deposit Guard is designed for UK renters to create timestamped photo-based condition reports that help protect their tenancy deposits from unfair deductions.</p>

                      <h3 className="font-semibold text-[#101827] text-base">1. Who we are and how to contact us</h3>
                      <p>The data controller responsible for your personal data is Deposit Guard Ltd, 55 St Paul's Street, Leeds, LS1 2TE, United Kingdom.</p>
                      <p>If you have any questions about this Privacy Policy or how we handle your data, you can contact us. If we appoint a Data Protection Officer (DPO), we will update this Policy with their contact details. You also have the right to complain to your local data protection authority, which in the UK is the Information Commissioner's Office (ICO).</p>

                      <h3 className="font-semibold text-[#101827] text-base">2. Who this policy applies to</h3>
                      <p>This Privacy Policy applies to: visitors to our website, including depositguard.com; people who contact us for support or feedback; people who fill out our surveys; and users who create an account and use the Service to document properties and generate reports.</p>
                      <p>Our Service is intended for adults who are renting property in the UK. It is not intended for children under 18.</p>

                      <h3 className="font-semibold text-[#101827] text-base">3. Personal data we collect</h3>
                      <p>We aim to collect only the data we need to provide the Service effectively and securely.</p>
                      <p className="font-medium text-[#101827]">3.1 Data you provide to us</p>
                      <p><span className="font-medium">Account data:</span> Name, phone number, email address, and password (stored as a hashed value, never in plain text).</p>
                      <p><span className="font-medium">Property and report data:</span> When you create a property record and condition report, we process: property address and descriptive details (e.g. flat/house, move-in date, notes); room names and types (e.g. kitchen, bedroom, hallway, garden); photos you capture through the in-app camera, including image files, time and date each photo was taken (EXIF/device timestamp), server upload timestamp, and your text notes/annotations about each photo; and generated PDF reports (which include your photos, notes, property details, timestamps and report metadata).</p>
                      <p><span className="font-medium">Support and communication data:</span> Messages you send to our support team (email or in-app help) and any additional information you choose to share (e.g. screenshots, descriptions of issues).</p>
                      <p className="font-medium text-[#101827]">3.2 Data we collect automatically</p>
                      <p>When you use the Service, we may automatically collect: IP address; device and browser information (type, version, operating system); log data (pages visited, actions taken, dates/times, error messages); and basic analytics data (e.g. number of properties created, number of photos per report, performance metrics).</p>
                      <p className="font-medium text-[#101827]">3.3 Cookies and similar technologies</p>
                      <p>We may use cookies and similar technologies to keep you logged in, remember your preferences, and measure how the Service is used and improve performance. Where required by law, we will ask for your consent via a cookie banner. You can manage your cookie preferences through your browser settings.</p>
                      <p className="font-medium text-[#101827]">3.4 Special category data</p>
                      <p>We do not intentionally collect special category data (such as data about your health, religion, or ethnicity). However, photos you capture inside a property could sometimes incidentally reveal sensitive information. We ask you not to photograph anything that reveals more personal information than necessary to document the condition of the property.</p>

                      <h3 className="font-semibold text-[#101827] text-base">4. Purposes and legal bases for processing</h3>
                      <p className="font-medium text-[#101827]">4.1 To provide the Service</p>
                      <p>We process your data as necessary to create and manage your account, allow you to define properties and rooms, capture photos and notes, and generate reports, store your reports and make them available in your dashboard, and provide core functionality such as offline capture and background syncing. Legal basis: Article 6(1)(b) – performance of a contract with you.</p>
                      <p className="font-medium text-[#101827]">4.2 To maintain security and prevent fraud</p>
                      <p>We process certain data to ensure photo timestamps are consistent and detect potential manipulation, monitor and protect the Service against abuse, bugs and attacks, and keep audit logs for technical and security purposes. Legal basis: Article 6(1)(f) – our legitimate interest in maintaining a secure and trustworthy platform.</p>
                      <p className="font-medium text-[#101827]">4.3 To improve and monitor the Service</p>
                      <p>We may use analytics to understand how the Service is used, for example performance and reliability metrics, and usage patterns (e.g. average photos per report, average report generation time). Legal basis: Article 6(1)(f) – our legitimate interest in improving and optimising the Service; and where required by ePrivacy/PECR, your consent under Article 6(1)(a).</p>
                      <p className="font-medium text-[#101827]">4.4 To communicate with you</p>
                      <p>We may send you service messages about your account or reports (e.g. email verification, password reset, report completion), important updates about security, privacy or terms, and occasional reminders directly related to ensuring the accuracy of your report. Legal basis: Article 6(1)(b) – performance of the contract and Article 6(1)(f) – our legitimate interest in keeping users informed. If we ever send direct marketing, we will always provide an unsubscribe option.</p>
                      <p className="font-medium text-[#101827]">4.5 To comply with legal obligations</p>
                      <p>We may process and retain certain data to comply with applicable laws and regulations, requests from law enforcement or regulatory bodies where lawful, and accounting, auditing and record-keeping requirements. Legal basis: Article 6(1)(c) – compliance with a legal obligation.</p>

                      <h3 className="font-semibold text-[#101827] text-base">5. How we share your personal data</h3>
                      <p>We do not sell your personal data.</p>
                      <p className="font-medium text-[#101827]">5.1 Service providers (processors)</p>
                      <p>We use trusted third-party providers to help us run the Service, including cloud hosting and storage, email delivery services, error monitoring and logging tools, and analytics providers. These providers act as processors and are only allowed to process your data on our instructions.</p>
                      <p className="font-medium text-[#101827]">5.2 Professional advisers</p>
                      <p>We may share data with lawyers, auditors, insurers or other professional advisers where necessary, for example in connection with legal claims or compliance.</p>
                      <p className="font-medium text-[#101827]">5.3 Legal and law enforcement</p>
                      <p>We may disclose your data where we believe in good faith that it is necessary to comply with a legal obligation or valid legal request, protect your vital interests or those of another person, establish, exercise or defend legal claims, or prevent or detect crime or fraud.</p>
                      <p className="font-medium text-[#101827]">5.4 Business transfers</p>
                      <p>If Deposit Guard is involved in a merger, acquisition, restructuring or sale of assets, your data may be transferred as part of that transaction. We will ensure any new owner continues to respect this Privacy Policy, and we will notify you where required by law.</p>
                      <p className="font-medium text-[#101827]">5.5 Sharing reports</p>
                      <p>We do not automatically share your reports with landlords, agents or third parties. You control who you share your reports with.</p>

                      <h3 className="font-semibold text-[#101827] text-base">6. International transfers</h3>
                      <p>Our primary infrastructure is intended to be hosted in regions that support compliance with UK/EU data-residency requirements. If we transfer your personal data outside the UK and/or EEA, we will ensure appropriate safeguards are in place, such as an adequacy decision by the UK or European Commission, or Standard Contractual Clauses (SCCs) or the UK International Data Transfer Agreement (IDTA). You can contact us for more details.</p>

                      <h3 className="font-semibold text-[#101827] text-base">7. Data retention – how long we keep your data</h3>
                      <p>We keep your personal data only as long as reasonably necessary for the purposes described in this Policy, including for the establishment, exercise or defence of legal claims, or as required by law.</p>
                      <p className="font-medium text-[#101827]">7.1 Account and profile data</p>
                      <p>We keep your account data while your account is active. If you close your account, we will generally delete or anonymise your account data within a reasonable period, except where we need to retain some data for legal or regulatory purposes.</p>
                      <p className="font-medium text-[#101827]">7.2 Property data, photos and reports</p>
                      <p>Your condition reports are a key part of the Service and may be needed as evidence in tenancy deposit disputes. Within the app, completed reports are locked and cannot be edited or regenerated, to preserve their integrity. We normally retain your reports while your account remains active. If you request deletion of a report or your entire account, we will delete or anonymise the relevant data, unless we have a compelling legitimate reason or legal obligation to retain certain information.</p>
                      <p className="font-medium text-[#101827]">7.3 Logs and analytics data</p>
                      <p>Technical logs and analytics data are kept for limited periods to allow us to troubleshoot issues, improve the Service and maintain security. Where possible, analytics data is aggregated or anonymised.</p>

                      <h3 className="font-semibold text-[#101827] text-base">8. Security</h3>
                      <p>We take security seriously and use appropriate technical and organisational measures to protect your data, including encryption in transit (TLS) and at rest for key data stores, access controls and role-based permissions for staff, audit logging for privileged actions and admin access, regular monitoring of system performance and error rates, and disaster recovery and backup procedures. You are responsible for keeping your password confidential and for choosing a strong, unique password.</p>

                      <h3 className="font-semibold text-[#101827] text-base">9. Your rights</h3>
                      <p>Depending on where you live (e.g. UK or EEA), you have several rights under data protection law:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Right of access – You can ask for a copy of the personal data we hold about you.</li>
                        <li>Right to rectification – You can ask us to correct inaccurate or incomplete data.</li>
                        <li>Right to erasure – You can ask us to delete your personal data in certain circumstances.</li>
                        <li>Right to restrict processing – You can ask us to restrict how we use your data in certain circumstances.</li>
                        <li>Right to data portability – You can ask for your data in a structured, machine-readable format.</li>
                        <li>Right to object – You can object to processing based on our legitimate interests or to direct marketing.</li>
                        <li>Right to withdraw consent – Where we rely on your consent, you can withdraw it at any time.</li>
                        <li>Right to lodge a complaint – You can complain to your local data protection authority, including the ICO in the UK.</li>
                      </ol>
                      <p>To exercise any of these rights, please contact us. We may need to verify your identity before responding.</p>

                      <h3 className="font-semibold text-[#101827] text-base">10. Children's privacy</h3>
                      <p>Our Service is intended for adults who are renting property. We do not knowingly collect personal data from children under 18. If you believe a child under 18 has provided us with personal data, please contact us and we will take appropriate steps to delete such data.</p>

                      <h3 className="font-semibold text-[#101827] text-base">11. Third-party links</h3>
                      <p>Our website or emails may contain links to third-party websites or services. These sites have their own privacy policies, and we are not responsible for their practices. We recommend you review those policies before providing any personal data to third parties.</p>

                      <h3 className="font-semibold text-[#101827] text-base">12. Changes to this Privacy Policy</h3>
                      <p>We may update this Privacy Policy from time to time to reflect changes in our Service, legal requirements or other factors. When we make material changes, we will update the "Last updated" date at the top of this page and take reasonable steps to inform you, for example via in-app messages or email. We encourage you to review this Policy periodically.</p>

                      <h3 className="font-semibold text-[#101827] text-base">13. Contact</h3>
                      <p>If you have any questions about this Privacy Policy or how we use your personal data, please contact us.</p>

                    </div>
                    <div className="p-6 pt-0">
                      <button
                        type="button"
                        onClick={() => setPrivacyModalOpen(false)}
                        className="w-full py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] font-medium text-base hover:bg-gray-50 transition-colors"
                        style={fontStyle}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {screen === "verify" && (
            <motion.div
              key="verify"
              initial={fadeScaleTransition.initial}
              animate={fadeScaleTransition.animate}
              exit={fadeScaleTransition.exit}
              transition={fadeScaleTransition.transition}
              className="flex flex-col"
            >
              <div className={`${cardClass} text-center`}>
                <div className="flex justify-center mb-7">
                  <Image
                    src="/dg-logo-dark.png"
                    alt="Deposit Guard"
                    width={211}
                    height={69}
                    priority
                    className="object-contain"
                  />
                </div>
                <h1
                  className="text-[#101827] font-semibold text-xl leading-tight mb-3"
                  style={fontStyle}
                >
                  Check your email
                </h1>
                <p className="text-[#6B7280] text-sm mb-6" style={fontStyle}>
                  We&apos;ve sent a verification link to your email address. Click the link to
                  verify your account.
                </p>
                <button
                  type="button"
                  onClick={() => goTo("welcome")}
                  className={`${btnPrimaryClass} mb-3`}
                  style={{ ...fontStyle, color: "#ffffff" }}
                >
                  I&apos;ve verified my email
                </button>
                <button
                  type="button"
                  onClick={() => goTo("login")}
                  className="text-[#008BFF] font-medium text-sm hover:underline"
                  style={fontStyle}
                >
                  Back to Sign In
                </button>
              </div>
            </motion.div>
          )}

          {screen === "welcome" && (
            <motion.div
              key="welcome"
              initial={fadeScaleTransition.initial}
              animate={fadeScaleTransition.animate}
              exit={fadeScaleTransition.exit}
              transition={fadeScaleTransition.transition}
              className="flex flex-col"
            >
              <div className={`${cardClass} text-center`}>
                <div className="flex justify-center mb-7">
                  <Image
                    src="/dg-logo-dark.png"
                    alt="Deposit Guard"
                    width={211}
                    height={69}
                    priority
                    className="object-contain"
                  />
                </div>
                <h1
                  className="text-[#101827] font-semibold text-xl leading-tight mb-3"
                  style={fontStyle}
                >
                  Welcome aboard
                </h1>
                <p className="text-[#6B7280] text-sm mb-6" style={fontStyle}>
                  You&apos;re all set. Start protecting your deposit today.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    router.replace("/dashboard");
                    router.refresh();
                  }}
                  className={btnPrimaryClass}
                  style={{ ...fontStyle, color: "#ffffff" }}
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

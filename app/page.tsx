"use client";

import { useEffect, useState, FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

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
  transition: { duration: 0.2, ease: "easeInOut" },
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
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name.trim() || undefined } },
      });
      if (signUpError) {
        setError(signUpError.message || "Unable to create your account. Please try again.");
        setLoading(false);
        return;
      }
      goTo("verify");
    } catch {
      setError("Something went wrong while creating your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8]">
        <div className="w-8 h-8 border-2 border-[#008BFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8] p-6 overflow-hidden">
      <div className="relative w-full max-w-[420px] min-h-[480px]">
        <AnimatePresence initial={false} mode="wait">
          {screen === "login" && (
            <motion.div
              key="login"
              initial={fadeScaleTransition.initial}
              animate={fadeScaleTransition.animate}
              exit={fadeScaleTransition.exit}
              transition={fadeScaleTransition.transition}
              className="absolute inset-0 flex flex-col"
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
                      Create Account
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
              className="absolute inset-0 flex flex-col"
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
              className="absolute inset-0 flex flex-col"
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
                  Set Up Your Account
                </h1>
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSignup} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="auth-name" className={labelClass} style={fontStyle}>
                      Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
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
                  <button
                    type="submit"
                    disabled={loading}
                    className={btnPrimaryClass}
                    style={{ ...fontStyle, color: "#ffffff" }}
                  >
                    {loading ? "Creating account…" : "Create Account"}
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
            </motion.div>
          )}

          {screen === "verify" && (
            <motion.div
              key="verify"
              initial={fadeScaleTransition.initial}
              animate={fadeScaleTransition.animate}
              exit={fadeScaleTransition.exit}
              transition={fadeScaleTransition.transition}
              className="absolute inset-0 flex flex-col"
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
              className="absolute inset-0 flex flex-col"
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
  );
}

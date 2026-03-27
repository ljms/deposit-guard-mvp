"use client";

import { useEffect, useState, FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toTitleCase } from "@/lib/format";
import { TermsPrivacyModals } from "@/components/auth/TermsPrivacyModals";

type AuthScreen = "login" | "signup" | "verify" | "welcome" | "forgotPassword";

const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };
const inputClass =
  "w-full py-2.5 px-3 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] text-base outline-none focus:border-[#008BFF] focus:ring-2 focus:ring-[#008BFF]/20";
const labelClass = "text-[#414651] font-medium text-sm";
const cardClass =
  "w-full max-w-[420px] bg-white rounded-2xl p-8 shadow-2xl";
const btnPrimaryClass =
  "w-full py-3 rounded-lg bg-[#008BFF] !text-white font-medium text-base hover:bg-[#0077E6] disabled:opacity-70 disabled:cursor-not-allowed transition-colors shadow-[0px_2px_5px_rgba(9,94,159,0.22)]";

const fadeScaleTransition = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.2, ease: "easeInOut" as const },
};

/** Large top-right geometric network; fades toward centre so the card stays clear. */
function AuthGeometricAccent() {
  const dissolveMask =
    "radial-gradient(ellipse 115% 100% at 100% 0%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 38%, rgba(0,0,0,0.2) 58%, rgba(0,0,0,0.06) 72%, transparent 82%)";
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div
        className="absolute top-0 right-0 min-h-[800px] min-w-[800px] h-[max(800px,52vh)] w-[max(800px,52vw)] md:min-h-[900px] md:min-w-[900px] md:h-[max(900px,58vh)] md:w-[max(900px,58vw)] lg:h-[min(max(960px,60vh),1200px)] lg:w-[min(max(960px,58vw),1200px)]"
        style={{
          maskImage: dissolveMask,
          WebkitMaskImage: dissolveMask,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1000 800"
          className="h-full w-full"
          preserveAspectRatio="xMaxYMin slice"
          aria-hidden
        >
          <g
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={1.15}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1={1020} y1={-40} x2={920} y2={40} />
            <line x1={920} y1={40} x2={780} y2={20} />
            <line x1={780} y1={20} x2={680} y2={95} />
            <line x1={680} y1={95} x2={560} y2={70} />
            <line x1={560} y1={70} x2={480} y2={140} />
            <line x1={480} y1={140} x2={380} y2={120} />
            <line x1={920} y1={40} x2={880} y2={130} />
            <line x1={880} y1={130} x2={760} y2={165} />
            <line x1={760} y1={165} x2={640} y2={200} />
            <line x1={640} y1={200} x2={540} y2={260} />
            <line x1={540} y1={260} x2={430} y2={240} />
            <line x1={430} y1={240} x2={360} y2={310} />
            <line x1={880} y1={130} x2={980} y2={160} />
            <line x1={980} y1={160} x2={940} y2={260} />
            <line x1={940} y1={260} x2={820} y2={290} />
            <line x1={820} y1={290} x2={700} y2={320} />
            <line x1={700} y1={320} x2={580} y2={360} />
            <line x1={580} y1={360} x2={500} y2={420} />
            <line x1={780} y1={20} x2={840} y2={100} />
            <line x1={840} y1={100} x2={900} y2={200} />
            <line x1={900} y1={200} x2={860} y2={300} />
            <line x1={860} y1={300} x2={720} y2={340} />
            <line x1={720} y1={340} x2={600} y2={400} />
            <line x1={600} y1={400} x2={480} y2={380} />
            <line x1={680} y1={95} x2={740} y2={180} />
            <line x1={740} y1={180} x2={680} y2={260} />
            <line x1={680} y1={260} x2={560} y2={300} />
            <line x1={560} y1={300} x2={450} y2={350} />
            <line x1={450} y1={350} x2={380} y2={420} />
            <line x1={980} y1={160} x2={1040} y2={90} />
            <line x1={940} y1={260} x2={1000} y2={340} />
            <line x1={820} y1={290} x2={880} y2={380} />
            <line x1={760} y1={165} x2={620} y2={140} />
            <line x1={620} y1={140} x2={520} y2={200} />
            <line x1={520} y1={200} x2={400} y2={190} />
            <line x1={400} y1={190} x2={320} y2={260} />
            <line x1={900} y1={200} x2={780} y2={230} />
            <line x1={640} y1={200} x2={520} y2={320} />
            <line x1={500} y1={420} x2={420} y2={480} />
            <line x1={720} y1={340} x2={620} y2={460} />
            <line x1={860} y1={300} x2={920} y2={400} />
          </g>
          <g fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth={1}>
            <circle cx={1040} cy={-60} r={140} />
            <circle cx={920} cy={30} r={95} />
            <circle cx={760} cy={10} r={72} />
            <circle cx={640} cy={110} r={58} />
            <circle cx={520} cy={85} r={48} />
            <circle cx={420} cy={150} r={42} />
            <circle cx={880} cy={150} r={68} />
            <circle cx={720} cy={200} r={52} />
            <circle cx={600} cy={240} r={44} />
            <circle cx={500} cy={310} r={38} />
            <circle cx={400} cy={280} r={32} />
            <circle cx={960} cy={220} r={56} />
            <circle cx={820} cy={280} r={48} />
            <circle cx={680} cy={320} r={40} />
            <circle cx={560} cy={360} r={34} />
            <circle cx={900} cy={360} r={62} />
            <circle cx={750} cy={400} r={46} />
            <circle cx={620} cy={430} r={36} />
            <circle cx={480} cy={400} r={30} />
            <circle cx={340} cy={360} r={26} />
            <circle cx={540} cy={480} r={28} />
          </g>
          <g fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.07)" strokeWidth={1}>
            <polygon points="850,55 882,75 882,115 850,135 818,115 818,75" />
            <polygon points="690,45 718,62 718,98 690,115 662,98 662,62" />
            <polygon points="580,125 608,142 608,178 580,195 552,178 552,142" />
            <polygon points="450,95 478,112 478,148 450,165 422,148 422,112" />
            <polygon points="920,175 948,192 948,228 920,245 892,228 892,192" />
            <polygon points="780,210 808,227 808,263 780,280 752,263 752,227" />
            <polygon points="640,255 668,272 668,308 640,325 612,308 612,272" />
            <polygon points="520,295 548,312 548,348 520,365 492,348 492,312" />
            <polygon points="880,295 905,310 905,342 880,357 855,342 855,310" />
            <polygon points="720,330 745,345 745,377 720,392 695,377 695,345" />
            <polygon points="560,385 585,400 585,432 560,447 535,432 535,400" />
            <polygon points="400,320 425,335 425,367 400,382 375,367 375,335" />
            <polygon points="980,120 1005,135 1005,167 980,182 955,167 955,135" />
          </g>
          <g fill="rgba(255,255,255,0.08)">
            <circle cx={920} cy={40} r={3.5} />
            <circle cx={780} cy={20} r={3} />
            <circle cx={680} cy={95} r={3.25} />
            <circle cx={560} cy={70} r={3} />
            <circle cx={480} cy={140} r={3} />
            <circle cx={380} cy={120} r={2.75} />
            <circle cx={880} cy={130} r={3} />
            <circle cx={760} cy={165} r={3} />
            <circle cx={640} cy={200} r={2.75} />
            <circle cx={540} cy={260} r={3} />
            <circle cx={430} cy={240} r={2.5} />
            <circle cx={360} cy={310} r={2.5} />
            <circle cx={980} cy={160} r={3} />
            <circle cx={940} cy={260} r={3} />
            <circle cx={820} cy={290} r={2.75} />
            <circle cx={700} cy={320} r={2.75} />
            <circle cx={580} cy={360} r={2.5} />
            <circle cx={500} cy={420} r={2.5} />
            <circle cx={840} cy={100} r={2.5} />
            <circle cx={900} cy={200} r={2.75} />
            <circle cx={860} cy={300} r={2.5} />
            <circle cx={720} cy={340} r={2.5} />
            <circle cx={600} cy={400} r={2.5} />
            <circle cx={740} cy={180} r={2.25} />
            <circle cx={680} cy={260} r={2.25} />
            <circle cx={560} cy={300} r={2.25} />
            <circle cx={450} cy={350} r={2.25} />
            <circle cx={620} cy={140} r={2.25} />
            <circle cx={520} cy={200} r={2.25} />
            <circle cx={400} cy={190} r={2} />
            <circle cx={320} cy={260} r={2} />
          </g>
        </svg>
      </div>
    </div>
  );
}

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
      <div className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center">
        <div
          className="fixed inset-0 bg-gradient-to-br from-[#1a1a86] to-[#008bff]"
          aria-hidden
        />
        <div
          className="fixed inset-0 pointer-events-none opacity-100"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 42%, rgba(255,255,255,0.06) 0%, transparent 60%)",
          }}
          aria-hidden
        />
        <AuthGeometricAccent />
        <div className="relative z-10 w-8 h-8 border-2 border-white/90 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden flex flex-col items-center justify-center py-8">
      <div
        className="fixed inset-0 bg-gradient-to-br from-[#1a1a86] to-[#008bff]"
        aria-hidden
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.045) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 85% 65% at 50% 45%, rgba(255,255,255,0.05) 0%, transparent 58%)",
        }}
        aria-hidden
      />
      <AuthGeometricAccent />
      <div className="relative z-10 w-full flex justify-center min-w-0">
        <div className="relative w-full max-w-[420px] mx-4 sm:mx-auto">
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

              <TermsPrivacyModals
                termsModalOpen={termsModalOpen}
                privacyModalOpen={privacyModalOpen}
                onCloseTerms={() => setTermsModalOpen(false)}
                onClosePrivacy={() => setPrivacyModalOpen(false)}
              />
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

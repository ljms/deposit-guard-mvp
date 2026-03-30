"use client";

import { useEffect, useState, FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TermsPrivacyModals } from "@/components/auth/TermsPrivacyModals";

const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };
const cardClass =
  "w-full bg-white rounded-2xl p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:max-w-xl md:p-10";
const btnPrimaryClass =
  "w-full py-3 md:py-3.5 rounded-lg bg-[#008BFF] !text-white font-medium text-base md:text-[1.05rem] hover:bg-[#0077E6] disabled:opacity-70 disabled:cursor-not-allowed transition-colors shadow-[0px_2px_5px_rgba(9,94,159,0.22)]";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("terms_accepted")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.terms_accepted === true) {
        router.replace("/dashboard");
        return;
      }
      setCheckingAuth(false);
    })();
  }, [router, supabase.auth]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agreed) return;
    setError(null);
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (updateError) {
        setError(updateError.message || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
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
    <div className="relative min-h-screen flex items-center justify-center bg-[#F8F8F8] py-8">
      {/* Desktop: block interaction with sidebar (z-50) until terms are accepted */}
      <div
        className="pointer-events-auto fixed inset-0 z-[60] hidden bg-black/50 backdrop-blur-sm md:block"
        aria-hidden
      />

      <div className="relative z-[70] flex w-full justify-center px-4 sm:px-6">
        <div className="flex w-full max-w-[420px] flex-col md:max-w-xl">
          <div className={cardClass}>
            <div className="mb-7 flex justify-center">
              <Image
                src="/dg-logo-dark.png"
                alt="Deposit Guard"
                width={211}
                height={69}
                priority
                className="h-[3.25rem] w-auto object-contain md:h-[4.25rem]"
              />
            </div>
            <div className="mb-5 space-y-2 text-left" style={fontStyle}>
              <h1 className="text-[1.0625rem] font-semibold leading-snug text-[#101827] md:text-2xl md:leading-tight">
                Before you get started
              </h1>
              <p className="text-sm leading-relaxed text-[#6B7280] md:text-base md:leading-relaxed">
                Please review and accept our{" "}
                <button
                  type="button"
                  onClick={() => setTermsModalOpen(true)}
                  className="inline cursor-pointer bg-transparent p-0 !text-[#008bff] font-medium hover:underline"
                >
                  Terms of Service
                </button>
                {" "}and{" "}
                <button
                  type="button"
                  onClick={() => setPrivacyModalOpen(true)}
                  className="inline cursor-pointer bg-transparent p-0 !text-[#008bff] font-medium hover:underline"
                >
                  Privacy Policy
                </button>
                .
              </p>
            </div>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex items-start gap-3">
                <input
                  id="onboarding-terms"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#008BFF] text-[#008BFF] focus:ring-[#008BFF]"
                />
                <label
                  htmlFor="onboarding-terms"
                  className="cursor-pointer text-sm text-[#414651] md:text-base"
                  style={fontStyle}
                >
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTermsModalOpen(true);
                    }}
                    className="inline cursor-pointer bg-transparent p-0 text-left !text-[#008bff] font-medium hover:underline"
                  >
                    Terms of Service
                  </button>
                  {" "}and{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPrivacyModalOpen(true);
                    }}
                    className="inline cursor-pointer bg-transparent p-0 text-left !text-[#008bff] font-medium hover:underline"
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>
              <button
                type="submit"
                disabled={!agreed || loading}
                className={btnPrimaryClass}
                style={{ ...fontStyle, color: "#ffffff" }}
              >
                {loading ? "Saving…" : "Continue"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <TermsPrivacyModals
        termsModalOpen={termsModalOpen}
        privacyModalOpen={privacyModalOpen}
        onCloseTerms={() => setTermsModalOpen(false)}
        onClosePrivacy={() => setPrivacyModalOpen(false)}
      />
    </div>
  );
}

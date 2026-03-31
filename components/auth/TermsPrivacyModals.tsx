"use client";

import { TermsOfServiceBody } from "@/components/auth/TermsOfServiceBody";
import { PrivacyPolicyBody } from "@/components/auth/PrivacyPolicyBody";
import { APP_MODAL_VIEWPORT_OFFSET_CLASS } from "@/components/layout/appModalViewport";

const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

export type TermsPrivacyModalsProps = {
  termsModalOpen: boolean;
  privacyModalOpen: boolean;
  onCloseTerms: () => void;
  onClosePrivacy: () => void;
};

/** In-app Terms of Service and Privacy Policy modals (e.g. OAuth terms acceptance on /onboarding). */
export function TermsPrivacyModals({
  termsModalOpen,
  privacyModalOpen,
  onCloseTerms,
  onClosePrivacy,
}: TermsPrivacyModalsProps) {
  return (
    <>
      {termsModalOpen && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 ${APP_MODAL_VIEWPORT_OFFSET_CLASS}`}
          onClick={onCloseTerms}
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-title"
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="terms-title" className="text-[#101827] font-semibold text-xl p-6 pb-2 shrink-0" style={fontStyle}>
              Terms of Service
            </h2>
            <div className="px-6 pb-6 overflow-y-auto flex-1 min-h-0" style={fontStyle}>
              <TermsOfServiceBody />
            </div>
            <div className="p-6 pt-0">
              <button
                type="button"
                onClick={onCloseTerms}
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
          className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 ${APP_MODAL_VIEWPORT_OFFSET_CLASS}`}
          onClick={onClosePrivacy}
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-title"
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="privacy-title" className="text-[#101827] font-semibold text-xl p-6 pb-2 shrink-0" style={fontStyle}>
              Privacy Policy
            </h2>
            <div className="px-6 pb-6 overflow-y-auto flex-1 min-h-0" style={fontStyle}>
              <PrivacyPolicyBody />
            </div>
            <div className="p-6 pt-0">
              <button
                type="button"
                onClick={onClosePrivacy}
                className="w-full py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] font-medium text-base hover:bg-gray-50 transition-colors"
                style={fontStyle}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

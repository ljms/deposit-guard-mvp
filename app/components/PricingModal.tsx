"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { STRIPE_PRICES } from "@/app/lib/stripe-prices";

type PricingModalProps = {
  reportId: string;
  onClose: () => void;
};

const fontClass = "font-[family-name:var(--font-poppins),Poppins,sans-serif]";

export function PricingModal({ reportId, onClose }: PricingModalProps) {
  const [loadingTier, setLoadingTier] = useState<"single" | "double" | null>(null);

  async function handleSelect(tier: "single" | "double") {
    try {
      setLoadingTier(tier);
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          priceId: STRIPE_PRICES[tier],
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Failed to create checkout session");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout start failed:", error);
      setLoadingTier(null);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 ${fontClass}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl md:p-8"
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-[#6b7280] hover:bg-black/5"
            aria-label="Close pricing modal"
          >
            x
          </button>

          <h2 className="mb-6 text-center text-2xl font-semibold text-[#010827] md:mb-8">Choose your plan</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 md:p-6">
              <h3 className="text-xl font-semibold text-[#010827]">1 Report - £9.99</h3>
              <p className="mt-2 text-sm text-[#6B7280]">Generate one report</p>
              <button
                type="button"
                onClick={() => void handleSelect("single")}
                disabled={loadingTier !== null}
                className="mt-6 w-full rounded-lg bg-[#008bff] py-3 text-base font-medium !text-white transition-opacity hover:opacity-95 disabled:opacity-60"
              >
                {loadingTier === "single" ? "Loading..." : "Select"}
              </button>
            </div>

            <div className="relative rounded-xl border border-[#E5E7EB] bg-white p-5 md:p-6">
              <span className="absolute right-4 top-4 rounded-full bg-[#008bff] px-3 py-1 text-xs font-semibold text-white">
                Best Value
              </span>
              <h3 className="text-xl font-semibold text-[#010827]">2 Reports - £14.99</h3>
              <p className="mt-2 text-sm text-[#6B7280]">Save £5 on your second report</p>
              <button
                type="button"
                onClick={() => void handleSelect("double")}
                disabled={loadingTier !== null}
                className="mt-6 w-full rounded-lg bg-[#008bff] py-3 text-base font-medium !text-white transition-opacity hover:opacity-95 disabled:opacity-60"
              >
                {loadingTier === "double" ? "Loading..." : "Select"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

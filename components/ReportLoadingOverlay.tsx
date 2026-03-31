"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { APP_MODAL_VIEWPORT_OFFSET_CLASS } from "@/components/layout/appModalViewport";

const MESSAGES = [
  "Loading your report...",
  "Fetching your photos...",
  "Almost ready...",
] as const;

type ReportLoadingOverlayProps = {
  fading?: boolean;
  isPageReady: boolean;
};

export function ReportLoadingOverlay({ fading = false, isPageReady }: ReportLoadingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isPageReady) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        const lastIndex = MESSAGES.length - 1;
        if (prev >= lastIndex) return prev;
        const next = prev + 1;
        if (next >= lastIndex) {
          clearInterval(interval);
          return lastIndex;
        }
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isPageReady]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm ${APP_MODAL_VIEWPORT_OFFSET_CLASS} ${fading ? "pointer-events-none" : ""}`}
    >
      <div className="flex flex-col items-center gap-4 text-white">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">
          {isPageReady ? MESSAGES[messageIndex] : "Loading your report..."}
        </p>
      </div>
    </motion.div>
  );
}


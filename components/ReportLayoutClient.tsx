"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ReportLoadingOverlay } from "./ReportLoadingOverlay";

export function ReportLayoutClient({ children }: { children: React.ReactNode }) {
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [isPageReady, setIsPageReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Reset overlay on every navigation to a report page
    setOverlayVisible(true);
    setFading(false);
  }, [pathname]);

  useEffect(() => {
    if (!overlayVisible) return;
    // Poll for images — once the real page has mounted and images are settling, fade out
    const poll = setInterval(() => {
      const images = Array.from(document.querySelectorAll("img"));
      if (images.length === 0) return;
      setIsPageReady(true);
      const allSettled = images.every((img) => (img as HTMLImageElement).complete);
      if (allSettled) {
        clearInterval(poll);
        setFading(true);
        setTimeout(() => setOverlayVisible(false), 700);
      }
    }, 300);
    // Hard fallback — never show overlay for more than 15 seconds
    const fallback = setTimeout(() => {
      clearInterval(poll);
      setFading(true);
      setTimeout(() => setOverlayVisible(false), 700);
    }, 15000);
    return () => {
      clearInterval(poll);
      clearTimeout(fallback);
    };
  }, [overlayVisible]);

  return (
    <>
      {overlayVisible && <ReportLoadingOverlay fading={fading} isPageReady={isPageReady} />}
      {children}
    </>
  );
}


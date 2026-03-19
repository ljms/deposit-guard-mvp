"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ReportLoadingOverlay } from "./ReportLoadingOverlay";

export function ReportLayoutClient({ children }: { children: React.ReactNode }) {
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [minDisplayElapsed, setMinDisplayElapsed] = useState(false);
  const [isPageReady, setIsPageReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Reset overlay on every navigation to a report page
    setOverlayVisible(true);
    setFading(false);
    setReportReady(false);
    setMinDisplayElapsed(false);
    setIsPageReady(false);
  }, [pathname]);

  useEffect(() => {
    const t = setTimeout(() => setMinDisplayElapsed(true), 1500);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    const onReady = () => {
      setReportReady(true);
      setIsPageReady(true);
    };
    window.addEventListener("report-data-ready", onReady as EventListener);
    return () => window.removeEventListener("report-data-ready", onReady as EventListener);
  }, []);

  useEffect(() => {
    if (!overlayVisible || fading) return;
    if (!reportReady || !minDisplayElapsed) return;
    setFading(true);
    const t = setTimeout(() => setOverlayVisible(false), 200);
    return () => clearTimeout(t);
  }, [overlayVisible, fading, reportReady, minDisplayElapsed]);

  return (
    <>
      {overlayVisible && <ReportLoadingOverlay fading={fading} isPageReady={isPageReady} />}
      {children}
    </>
  );
}


import type { MouseEvent } from "react";

/** Canonical marketing-site URLs (absolute so app host e.g. app.depositguard.com never resolves /privacy locally). */
export const LEGAL_TERMS_URL = "https://depositguard.com/terms";
export const LEGAL_PRIVACY_URL = "https://depositguard.com/privacy";

/**
 * Tailwind `md` (768px): open in a new tab. Smaller viewports: normal navigation (same tab).
 * Opens `e.currentTarget.href` so the new tab always matches the anchor `href` attribute.
 * Stops propagation so links inside `<label>` do not toggle the associated checkbox.
 */
export function handleLegalExternalLinkClick(e: MouseEvent<HTMLAnchorElement>) {
  e.stopPropagation();
  if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
    e.preventDefault();
    window.open(e.currentTarget.href, "_blank", "noopener,noreferrer");
  }
}

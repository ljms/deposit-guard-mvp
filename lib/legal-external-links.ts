import type { MouseEvent } from "react";

export const LEGAL_TERMS_URL = "https://depositguard.com/terms";
export const LEGAL_PRIVACY_POLICY_URL = "https://depositguard.com/privacy-policy";

/**
 * Tailwind `md` (768px): open in a new tab. Smaller viewports: normal navigation (same tab).
 * Use on `<a href={url}>` so middle-click / copy link still work. Always stops propagation so
 * links inside `<label>` do not toggle the associated checkbox.
 */
export function handleLegalExternalLinkClick(e: MouseEvent<HTMLAnchorElement>, url: string) {
  e.stopPropagation();
  if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
    e.preventDefault();
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/**
 * Converts a string to title case (e.g. "front street" → "Front Street").
 * Applied at save time so users can type however they like.
 */
export function toTitleCase(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  return trimmed.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/**
 * Formats a UK postcode for storage: uppercase with normalized spacing (e.g. "ls1 2te" → "LS1 2TE").
 */
export function formatPostcode(s: string): string {
  return s.trim().toUpperCase();
}

/**
 * Use on `fixed inset-0` modal/backdrop roots inside AppLayout so flex centering aligns
 * with the main content column (240px desktop sidebar shows at `lg`).
 * Omit on full-bleed routes without the sidebar (e.g. public report viewer).
 */
export const APP_MODAL_VIEWPORT_OFFSET_CLASS = "lg:left-[240px]";

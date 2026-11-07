/**
 * Only ever redirect to a path on this site. Anything else (absolute URLs, //host, /\host, javascript:)
 * falls back to `fallback`, so `?next=` can't be abused as an open redirect.
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || next.length > 300) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) return fallback;
  // The auth pages themselves make no sense as a destination.
  if (/^\/(sign-in|sign-up|forgot-password|reset-password|check-email)(\/|\?|$)/.test(next)) return fallback;
  return next;
}

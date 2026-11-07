// Identifier and paging guards shared by every service. Anything that reaches the database as an id or an
// offset must pass through here first, so hostile input (a NUL byte in a URL, "-5" as a page, a number where a
// uuid belongs) becomes a clean "not found" / first page instead of a raw database error.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Better Auth ids are 32 URL-safe characters; test fixtures use uuids. Never anything with control characters. */
const USER_ID = /^[A-Za-z0-9_-]{1,64}$/;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
export const isUserId = (v: unknown): v is string => typeof v === "string" && USER_ID.test(v);
export const USER_ID_PATTERN = USER_ID;

/** A safe 1-based page number: finite, whole, at least 1, and no further than the last page. */
export function pageOf(requested: unknown, pageCount: number): number {
  const n = Math.floor(Number(requested));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, Math.max(1, pageCount));
}

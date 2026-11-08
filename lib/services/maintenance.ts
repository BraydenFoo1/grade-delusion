import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db/types";

const DAY = 24 * 3600;

/**
 * Housekeeping that keeps short-lived personal data short-lived. Everything deleted here is already useless:
 *  - expired sign-in sessions (they hold an IP address and browser string),
 *  - expired confirmation / reset tokens,
 *  - rate-limit counters whose window ended (their keys contain IP addresses or e-mail addresses).
 * Safe to run at any time and as often as you like.
 */
export async function pruneExpired(db: Db, nowMs = Date.now()): Promise<{ sessions: number; verifications: number; rateLimits: number }> {
  const now = new Date(nowMs);
  const cutoffSec = Math.floor(nowMs / 1000) - 2 * DAY;
  const cutoffMs = nowMs - 2 * DAY * 1000;
  const sessions = await db.execute(sql`delete from session where expires_at < ${now} returning 1`);
  const verifications = await db.execute(sql`delete from verification where expires_at < ${now} returning 1`);
  const a = await db.execute(sql`delete from app_rate_limit where window_start < ${cutoffSec} returning 1`);
  const b = await db.execute(sql`delete from rate_limit where last_request < ${cutoffMs} returning 1`);
  return { sessions: sessions.rows.length, verifications: verifications.rows.length, rateLimits: a.rows.length + b.rows.length };
}

/** Roughly one request in a hundred does the housekeeping, so it needs no scheduler and costs almost nothing. */
export function maybePruneExpired(db: Db, random: () => number = Math.random): void {
  if (random() < 0.01) void pruneExpired(db).catch(() => undefined);
}

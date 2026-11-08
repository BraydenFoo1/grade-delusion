import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db/types";
import { AppError } from "@/lib/platform/errors";
import { maybePruneExpired } from "./maintenance";

export type RateResult = { allowed: boolean; count: number; retryAfterSec: number };

/**
 * Fixed-window counter shared by every server instance (it lives in Postgres), so limits hold on
 * serverless where in-memory counters reset on every cold start. One atomic upsert per call.
 * Failed attempts count too: hammering an endpoint never earns a fresh window.
 */
export async function consumeRateLimit(
  db: Db,
  key: string,
  limit: number,
  windowSec: number,
  nowMs = Date.now(),
): Promise<RateResult> {
  const now = Math.floor(nowMs / 1000);
  const res = await db.execute(sql`
    insert into app_rate_limit (key, count, window_start)
    values (${key}, 1, ${now})
    on conflict (key) do update set
      count = case when app_rate_limit.window_start + ${windowSec} <= ${now} then 1 else app_rate_limit.count + 1 end,
      window_start = case when app_rate_limit.window_start + ${windowSec} <= ${now} then ${now} else app_rate_limit.window_start end
    returning count::int as count, window_start::bigint as window_start
  `);
  const row = res.rows[0] as { count: number | string; window_start: number | string | bigint };
  maybePruneExpired(db);
  const count = Number(row.count);
  const start = Number(row.window_start);
  return { allowed: count <= limit, count, retryAfterSec: Math.max(1, start + windowSec - now) };
}

/** Throws RATE_LIMITED (with a retry hint) when the caller is over the limit. */
export async function assertRateLimit(
  db: Db,
  key: string,
  limit: number,
  windowSec: number,
  what = "That",
  nowMs = Date.now(),
): Promise<void> {
  const r = await consumeRateLimit(db, key, limit, windowSec, nowMs);
  if (!r.allowed) {
    throw new AppError("RATE_LIMITED", `${what} is happening too often.`, { retryAfterSec: r.retryAfterSec });
  }
}

/** Housekeeping: drop counters whose window ended long ago. Safe to run any time. */
export async function pruneRateLimits(db: Db, olderThanSec = 2 * 24 * 3600, nowMs = Date.now()): Promise<void> {
  const cutoff = Math.floor(nowMs / 1000) - olderThanSec;
  await db.execute(sql`delete from app_rate_limit where window_start < ${cutoff}`);
}

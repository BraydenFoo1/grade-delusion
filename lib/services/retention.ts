import { and, eq, lt, sql } from "drizzle-orm";
import type { AppDb } from "@/lib/db/types";
import { post } from "@/lib/db/schema";
import { REJECTED_RETENTION_DAYS } from "@/lib/platform/constants";
import { recordAudit } from "./audit";
import { pruneExpired } from "./maintenance";

/**
 * Retention process for rejected submissions (documented in docs/SECURITY.md).
 *
 * Rejected posts are kept for REJECTED_RETENTION_DAYS after the moderator's decision so the author can
 * read the note and ask questions, then deleted. Deleting a post also deletes its comments, reactions,
 * notifications and reports (ON DELETE CASCADE). What stays: the moderation history and audit entries,
 * which hold ids and moderator-written notes but never the post text.
 *
 * This is NEVER scheduled automatically. Run it deliberately with `npm run retention:purge`
 * (dry-run by default). Moving it to a cron job needs an explicit decision.
 */
export async function purgeRejectedPosts(
  db: AppDb,
  opts: { olderThanDays?: number; dryRun?: boolean; now?: Date } = {},
): Promise<{ candidates: number; deleted: number; dryRun: boolean }> {
  const days = opts.olderThanDays ?? REJECTED_RETENTION_DAYS;
  const dryRun = opts.dryRun ?? true;
  const cutoff = new Date((opts.now ?? new Date()).getTime() - days * 24 * 3600 * 1000);
  // Rejected posts always have a moderation time; fall back to the last update just in case.
  const aged = and(eq(post.status, "rejected"), lt(sql`coalesce(${post.moderatedAt}, ${post.updatedAt})`, cutoff));

  return db.transaction(async (tx) => {
    const found = await tx.select({ id: post.id }).from(post).where(aged);
    let deleted = 0;
    if (!dryRun && found.length > 0) {
      const res = await tx.delete(post).where(aged).returning({ id: post.id });
      deleted = res.length;
    }
    await recordAudit(tx, {
      action: "retention.purge_rejected",
      targetType: "post",
      details: { olderThanDays: days, candidates: found.length, deleted, dryRun },
    });
    if (!dryRun) await pruneExpired(tx);
    return { candidates: found.length, deleted, dryRun };
  });
}

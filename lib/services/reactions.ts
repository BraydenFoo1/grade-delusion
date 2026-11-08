import { and, count, eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/types";
import { post, reaction } from "@/lib/db/schema";
import { assertCanParticipate, type Actor } from "@/lib/platform/actor";
import { REACTION_KEYS, type ReactionKey } from "@/lib/platform/constants";
import { AppError } from "@/lib/platform/errors";
import { parse, reactionInput } from "@/lib/platform/validation";
import { assertRateLimit } from "./rate-limit";

/**
 * Set, change or clear (`kind: null`) the caller's single reaction on an approved post.
 * Returns the fresh counts so the UI can update without a reload.
 */
export async function setReaction(
  db: AppDb,
  actor: Actor,
  input: unknown,
): Promise<{ counts: Record<ReactionKey, number>; mine: ReactionKey | null }> {
  assertCanParticipate(actor);
  const { postId, kind } = parse(reactionInput, input);
  await assertRateLimit(db, `react:${actor.id}`, 60, 60, "Reacting");

  const [target] = await db.select({ status: post.status }).from(post).where(eq(post.id, postId)).limit(1);
  if (!target || target.status !== "approved") throw new AppError("NOT_FOUND", "We couldn't find that post.");

  if (kind === null) {
    await db.delete(reaction).where(and(eq(reaction.postId, postId), eq(reaction.userId, actor.id)));
  } else {
    await db
      .insert(reaction)
      .values({ postId, userId: actor.id, kind })
      .onConflictDoUpdate({ target: [reaction.postId, reaction.userId], set: { kind, createdAt: new Date() } });
  }

  const rows = await db.select({ kind: reaction.kind, n: count() }).from(reaction).where(eq(reaction.postId, postId)).groupBy(reaction.kind);
  const counts = Object.fromEntries(REACTION_KEYS.map((k) => [k, 0])) as Record<ReactionKey, number>;
  for (const r of rows) counts[r.kind as ReactionKey] = Number(r.n);
  return { counts, mine: kind };
}

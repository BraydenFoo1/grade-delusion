import { and, asc, count, desc, eq, ilike, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { AppDb, Db } from "@/lib/db/types";
import { comment, post, report, user } from "@/lib/db/schema";
import { assertCanParticipate, assertStaff, type Actor } from "@/lib/platform/actor";
import { LIMITS } from "@/lib/platform/constants";
import { AppError } from "@/lib/platform/errors";
import { pageOf } from "@/lib/platform/ids";
import { assertContentAllowed } from "@/lib/platform/spam";
import { escapeLike } from "@/lib/platform/text";
import { commentInput, parse } from "@/lib/platform/validation";
import { recordModeration } from "./audit";
import { notify } from "./notifications";
import { isUuid, type Page } from "./posts";
import { assertRateLimit } from "./rate-limit";
import { getSettings } from "./settings";

export type CommentView = {
  id: string;
  parentId: string | null;
  /** `null` for removed comments: the text is never sent to the browser. */
  body: string | null;
  removed: boolean;
  createdAt: Date;
  author: { id: string; name: string };
};

const MAX_THREAD = 200;

/** All comments on an approved post (top-level first, replies after their parent). Removed ones are placeholders. */
export async function listComments(db: Db, postId: string): Promise<CommentView[]> {
  if (!isUuid(postId)) return [];
  const rows = await db
    .select({
      id: comment.id,
      parentId: comment.parentId,
      body: comment.body,
      status: comment.status,
      createdAt: comment.createdAt,
      authorId: comment.authorId,
      authorName: user.name,
    })
    .from(comment)
    .innerJoin(user, eq(user.id, comment.authorId))
    .innerJoin(post, eq(post.id, comment.postId))
    .where(and(eq(comment.postId, postId), eq(post.status, "approved")))
    .orderBy(asc(comment.createdAt), asc(comment.id))
    .limit(MAX_THREAD);
  const removed = (r: (typeof rows)[number]) => r.status === "removed";
  // Hide removed comments that nobody replied to; keep a placeholder when a thread hangs off one.
  const hasReplies = new Set(rows.filter((r) => r.parentId).map((r) => r.parentId));
  return rows
    .filter((r) => !removed(r) || hasReplies.has(r.id))
    .map((r) => ({
      id: r.id,
      parentId: r.parentId,
      body: removed(r) ? null : r.body,
      removed: removed(r),
      createdAt: r.createdAt,
      author: removed(r) ? { id: "", name: "" } : { id: r.authorId, name: r.authorName },
    }));
}

export async function createComment(db: AppDb, actor: Actor, input: unknown): Promise<{ id: string }> {
  assertCanParticipate(actor);
  const data = parse(commentInput, input);
  const settings = await getSettings(db);
  if (!settings.commentsOpen) throw new AppError("UNAVAILABLE", "Comments are paused right now.");
  assertContentAllowed(data.body, settings);

  const [target] = await db
    .select({ id: post.id, status: post.status, authorId: post.authorId })
    .from(post)
    .where(eq(post.id, data.postId))
    .limit(1);
  // Only approved posts accept comments; anything else looks like it doesn't exist.
  if (!target || target.status !== "approved") throw new AppError("NOT_FOUND", "We couldn't find that post.");

  let parentAuthorId: string | null = null;
  if (data.parentId) {
    const [parent] = await db
      .select({ postId: comment.postId, parentId: comment.parentId, status: comment.status, authorId: comment.authorId })
      .from(comment)
      .where(eq(comment.id, data.parentId))
      .limit(1);
    if (!parent || parent.postId !== data.postId || parent.status !== "visible") {
      throw new AppError("NOT_FOUND", "The comment you're replying to is gone.");
    }
    if (parent.parentId) throw new AppError("VALIDATION", "You can only reply to top-level comments.");
    parentAuthorId = parent.authorId;
  }

  if (settings.commentCooldownSec > 0) await assertRateLimit(db, `comment-burst:${actor.id}`, 1, settings.commentCooldownSec, "Commenting");
  await assertRateLimit(db, `comment-day:${actor.id}`, settings.dailyCommentLimit, 24 * 3600, "Commenting");

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(comment)
      .values({ postId: data.postId, authorId: actor.id, parentId: data.parentId ?? null, body: data.body })
      .returning({ id: comment.id });
    if (parentAuthorId) {
      await notify(tx, {
        userId: parentAuthorId,
        type: "reply_to_comment",
        actorId: actor.id,
        postId: data.postId,
        commentId: row.id,
        message: `${actor.name} replied to your comment.`,
      });
    }
    // The post's author hears about every comment, unless they were just notified about a reply.
    if (target.authorId !== parentAuthorId) {
      await notify(tx, {
        userId: target.authorId,
        type: "comment_on_post",
        actorId: actor.id,
        postId: data.postId,
        commentId: row.id,
        message: `${actor.name} commented on your delusion.`,
      });
    }
    return row;
  });
}

/** Authors can delete their own comment (replies go with it), unless a report on it is still open. */
export async function deleteOwnComment(db: AppDb, actor: Pick<Actor, "id">, id: string): Promise<void> {
  if (!isUuid(id)) throw new AppError("NOT_FOUND", "We couldn't find that comment.");
  await db.transaction(async (tx) => {
    const [row] = await tx.select({ status: comment.status }).from(comment).where(and(eq(comment.id, id), eq(comment.authorId, actor.id))).limit(1);
    if (!row) throw new AppError("NOT_FOUND", "We couldn't find that comment.");
    if (row.status === "removed") throw new AppError("FORBIDDEN", "Comments removed by moderators can't be deleted.");
    const [open] = await tx.select({ n: count() }).from(report).where(and(eq(report.commentId, id), eq(report.status, "open")));
    if (Number(open.n) > 0) throw new AppError("CONFLICT", "This comment is being reviewed after a report.");
    await tx.delete(comment).where(and(eq(comment.id, id), eq(comment.authorId, actor.id)));
  });
}

/* ------------------------------------------------------------------ */
/* Staff                                                              */
/* ------------------------------------------------------------------ */

export type StaffCommentView = {
  id: string;
  postId: string;
  body: string;
  status: "visible" | "removed";
  createdAt: Date;
  author: { id: string; name: string };
  removalNote: string | null;
  removedByName: string | null;
  openReports: number;
};

export async function listCommentsForStaff(
  db: Db,
  actor: Actor,
  opts: { status?: "visible" | "removed"; q?: string; authorId?: string; page?: number } = {},
): Promise<Page<StaffCommentView>> {
  assertStaff(actor);
  const size = LIMITS.adminPageSize;
  const remover = alias(user, "remover");
  const pattern = opts.q ? `%${escapeLike(opts.q)}%` : null;
  const where = and(
    opts.status ? eq(comment.status, opts.status) : undefined,
    opts.authorId ? eq(comment.authorId, opts.authorId) : undefined,
    pattern ? ilike(comment.body, pattern) : undefined,
  );
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(comment).where(where);
  const pageCount = Math.max(1, Math.ceil(n / size));
  const page = pageOf(opts.page, pageCount);
  const rows = await db
    .select({
      id: comment.id,
      postId: comment.postId,
      body: comment.body,
      status: comment.status,
      createdAt: comment.createdAt,
      authorId: comment.authorId,
      authorName: user.name,
      removalNote: comment.removalNote,
      removedByName: remover.name,
      openReports: sql<number>`(select count(*) from report r where r.comment_id = ${comment.id} and r.status = 'open')::int`,
    })
    .from(comment)
    .innerJoin(user, eq(user.id, comment.authorId))
    .leftJoin(remover, eq(remover.id, comment.removedById))
    .where(where)
    .orderBy(desc(comment.createdAt), desc(comment.id))
    .limit(size)
    .offset((page - 1) * size);
  return {
    items: rows.map((r) => ({
      id: r.id,
      postId: r.postId,
      body: r.body,
      status: r.status as "visible" | "removed",
      createdAt: r.createdAt,
      author: { id: r.authorId, name: r.authorName },
      removalNote: r.removalNote,
      removedByName: r.removedByName,
      openReports: Number(r.openReports),
    })),
    total: n,
    page,
    pageCount,
  };
}

/** Remove (or restore) a comment as staff. Atomic with its history row, audit entry and the author's notice. */
export async function moderateComment(
  db: AppDb,
  actor: Actor,
  input: { id: string; decision: "remove" | "restore"; note?: string },
): Promise<void> {
  assertStaff(actor);
  if (!isUuid(input.id)) throw new AppError("NOT_FOUND", "We couldn't find that comment.");
  const note = input.note?.trim().slice(0, LIMITS.moderationNoteMax) || undefined;
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: comment.status, authorId: comment.authorId, postId: comment.postId })
      .from(comment)
      .where(eq(comment.id, input.id))
      .limit(1);
    if (!current) throw new AppError("NOT_FOUND", "We couldn't find that comment.");
    if (current.authorId === actor.id && actor.role !== "admin") {
      throw new AppError("FORBIDDEN", "Ask another moderator to review your own comment.");
    }
    const removing = input.decision === "remove";
    const [updated] = await tx
      .update(comment)
      .set(
        removing
          ? { status: "removed", removedById: actor.id, removedAt: new Date(), removalNote: note ?? null }
          : { status: "visible", removedById: null, removedAt: null, removalNote: null },
      )
      .where(and(eq(comment.id, input.id), eq(comment.status, removing ? "visible" : "removed")))
      .returning({ id: comment.id });
    if (!updated) throw new AppError("CONFLICT", `That comment is already ${current.status}.`);
    await recordModeration(tx, actor, {
      action: removing ? "comment_removed" : "comment_restored",
      targetType: "comment",
      targetId: input.id,
      targetUserId: current.authorId,
      note,
    });
    if (removing) {
      await notify(tx, {
        userId: current.authorId,
        type: "comment_removed",
        message: note ? `A moderator removed your comment. Note from the moderators: ${note}` : "A moderator removed your comment.",
      });
    }
  });
}

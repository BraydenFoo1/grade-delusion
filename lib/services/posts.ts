import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { AppDb, Db } from "@/lib/db/types";
import { comment, post, reaction, report, user } from "@/lib/db/schema";
import { assertCanParticipate, assertStaff, type Actor } from "@/lib/platform/actor";
import {
  CATEGORY_KEYS,
  LIMITS,
  REACTION_KEYS,
  type CategoryKey,
  type PostStatus,
  type ReactionKey,
} from "@/lib/platform/constants";
import { AppError } from "@/lib/platform/errors";
import { isUuid, pageOf } from "@/lib/platform/ids";
import { assertContentAllowed } from "@/lib/platform/spam";
import { escapeLike, fingerprint } from "@/lib/platform/text";
import { type FeedQuery, moderateInput, parse, postInput } from "@/lib/platform/validation";
import { recordModeration } from "./audit";
import { notify } from "./notifications";
import { assertRateLimit } from "./rate-limit";
import { getSettings } from "./settings";

export type PostView = {
  id: string;
  body: string;
  category: CategoryKey;
  status: PostStatus;
  createdAt: Date;
  publishedAt: Date | null;
  editedAt: Date | null;
  author: { id: string; name: string };
  reactions: Record<ReactionKey, number>;
  myReaction: ReactionKey | null;
  commentCount: number;
};

/** What the author (and staff) see on top of the public view. Never sent for other people's posts. */
export type PrivatePostView = PostView & { moderationNote: string | null };
export type StaffPostView = PrivatePostView & { openReports: number; moderatorName: string | null; moderatedAt: Date | null };

export type Page<T> = { items: T[]; total: number; page: number; pageCount: number };

export { isUuid };

type BaseRow = {
  id: string;
  body: string;
  category: string;
  status: string;
  createdAt: Date;
  publishedAt: Date | null;
  editedAt: Date | null;
  authorId: string;
  authorName: string;
  moderationNote: string | null;
};

const baseColumns = {
  id: post.id,
  body: post.body,
  category: post.category,
  status: post.status,
  createdAt: post.createdAt,
  publishedAt: post.publishedAt,
  editedAt: post.editedAt,
  authorId: post.authorId,
  authorName: user.name,
  moderationNote: post.moderationNote,
};

const emptyReactions = (): Record<ReactionKey, number> => Object.fromEntries(REACTION_KEYS.map((k) => [k, 0])) as Record<ReactionKey, number>;

/** Attach reaction counts, comment counts and the viewer's own reaction to a page of posts (3 queries total). */
async function hydrate(db: Db, rows: BaseRow[], viewerId?: string): Promise<PrivatePostView[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [reactionRows, commentRows, mine] = await Promise.all([
    db
      .select({ postId: reaction.postId, kind: reaction.kind, n: count() })
      .from(reaction)
      .where(inArray(reaction.postId, ids))
      .groupBy(reaction.postId, reaction.kind),
    db
      .select({ postId: comment.postId, n: count() })
      .from(comment)
      .where(and(inArray(comment.postId, ids), eq(comment.status, "visible")))
      .groupBy(comment.postId),
    viewerId
      ? db
          .select({ postId: reaction.postId, kind: reaction.kind })
          .from(reaction)
          .where(and(inArray(reaction.postId, ids), eq(reaction.userId, viewerId)))
      : Promise.resolve([] as { postId: string; kind: string }[]),
  ]);
  const reactions = new Map<string, Record<ReactionKey, number>>();
  for (const r of reactionRows) {
    const m = reactions.get(r.postId) ?? emptyReactions();
    m[r.kind as ReactionKey] = Number(r.n);
    reactions.set(r.postId, m);
  }
  const comments = new Map(commentRows.map((c) => [c.postId, Number(c.n)]));
  const myReactions = new Map(mine.map((m) => [m.postId, m.kind as ReactionKey]));
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    category: r.category as CategoryKey,
    status: r.status as PostStatus,
    createdAt: r.createdAt,
    publishedAt: r.publishedAt,
    editedAt: r.editedAt,
    author: { id: r.authorId, name: r.authorName },
    reactions: reactions.get(r.id) ?? emptyReactions(),
    myReaction: myReactions.get(r.id) ?? null,
    commentCount: comments.get(r.id) ?? 0,
    moderationNote: r.moderationNote,
  }));
}

/** Strip private fields: used for anything that reaches a page other people can load. */
function toPublic(p: PrivatePostView): PostView {
  const { moderationNote: _omit, ...rest } = p;
  void _omit;
  return rest;
}

const pageMeta = (total: number, page: number, size: number) => ({ total, page, pageCount: Math.max(1, Math.ceil(total / size)) });

/* ------------------------------------------------------------------ */
/* Public reads: approved posts only                                  */
/* ------------------------------------------------------------------ */

export async function listPublicPosts(
  db: Db,
  query: FeedQuery,
  opts: { viewerId?: string; authorId?: string } = {},
): Promise<Page<PostView>> {
  const size = LIMITS.pageSize;
  const pattern = query.q ? `%${escapeLike(query.q)}%` : null;
  const where = and(
    eq(post.status, "approved"),
    query.category !== "all" ? eq(post.category, query.category) : undefined,
    opts.authorId ? eq(post.authorId, opts.authorId) : undefined,
    pattern ? or(ilike(post.body, pattern), ilike(user.name, pattern)) : undefined,
  );
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(post).innerJoin(user, eq(user.id, post.authorId)).where(where);
  const meta = pageMeta(n, query.page, size);
  const page = pageOf(query.page, meta.pageCount);
  const order =
    query.sort === "top"
      ? [desc(sql`(select count(*) from reaction r where r.post_id = ${post.id})`), desc(post.publishedAt), desc(post.id)]
      : [desc(post.publishedAt), desc(post.id)];
  const rows = await db
    .select(baseColumns)
    .from(post)
    .innerJoin(user, eq(user.id, post.authorId))
    .where(where)
    .orderBy(...order)
    .limit(size)
    .offset((page - 1) * size);
  const items = (await hydrate(db, rows, opts.viewerId)).map(toPublic);
  return { items, total: n, page, pageCount: meta.pageCount };
}

/** A single approved post, or null. Pending, rejected and removed posts are invisible here, always. */
export async function getPublicPost(db: Db, id: string, viewerId?: string): Promise<PostView | null> {
  if (!isUuid(id)) return null;
  const rows = await db
    .select(baseColumns)
    .from(post)
    .innerJoin(user, eq(user.id, post.authorId))
    .where(and(eq(post.id, id), eq(post.status, "approved")))
    .limit(1);
  const [view] = await hydrate(db, rows, viewerId);
  return view ? toPublic(view) : null;
}

/* ------------------------------------------------------------------ */
/* The author's own posts                                             */
/* ------------------------------------------------------------------ */

export async function getOwnPost(db: Db, actor: Pick<Actor, "id">, id: string): Promise<PrivatePostView | null> {
  if (!isUuid(id)) return null;
  const rows = await db
    .select(baseColumns)
    .from(post)
    .innerJoin(user, eq(user.id, post.authorId))
    .where(and(eq(post.id, id), eq(post.authorId, actor.id)))
    .limit(1);
  return (await hydrate(db, rows, actor.id))[0] ?? null;
}

export async function listOwnPosts(
  db: Db,
  actor: Pick<Actor, "id">,
  opts: { status?: PostStatus; page?: number } = {},
): Promise<Page<PrivatePostView>> {
  const size = LIMITS.pageSize;
  const where = and(eq(post.authorId, actor.id), opts.status ? eq(post.status, opts.status) : undefined);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(post).where(where);
  const meta = pageMeta(n, opts.page ?? 1, size);
  const page = pageOf(opts.page, meta.pageCount);
  const rows = await db
    .select(baseColumns)
    .from(post)
    .innerJoin(user, eq(user.id, post.authorId))
    .where(where)
    .orderBy(desc(post.createdAt), desc(post.id))
    .limit(size)
    .offset((page - 1) * size);
  return { items: await hydrate(db, rows, actor.id), total: n, page, pageCount: meta.pageCount };
}

/** Counts of the author's posts by status (dashboard). */
export async function countOwnPostsByStatus(db: Db, actor: Pick<Actor, "id">): Promise<Record<PostStatus, number>> {
  const rows = await db.select({ status: post.status, n: count() }).from(post).where(eq(post.authorId, actor.id)).groupBy(post.status);
  const out: Record<PostStatus, number> = { pending: 0, approved: 0, rejected: 0, removed: 0 };
  for (const r of rows) out[r.status as PostStatus] = Number(r.n);
  return out;
}

/** How many posts are waiting for review (staff dashboards and the admin badge). */
export async function countPendingPosts(db: Db): Promise<number> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(post).where(eq(post.status, "pending"));
  return n;
}

/* ------------------------------------------------------------------ */
/* Writes by the author                                               */
/* ------------------------------------------------------------------ */

export async function createPost(db: AppDb, actor: Actor, input: unknown): Promise<{ id: string }> {
  assertCanParticipate(actor);
  const data = parse(postInput, input);
  const settings = await getSettings(db);
  if (!settings.submissionsOpen) throw new AppError("UNAVAILABLE", "New submissions are paused right now. Check back soon.");
  assertContentAllowed(data.body, settings);

  // Limits first, and OUTSIDE the transaction below: a rejected request must keep the count it consumed
  // (rolling it back would let a client retry for free).
  if (settings.postCooldownSec > 0) await assertRateLimit(db, `post-burst:${actor.id}`, 1, settings.postCooldownSec, "Submitting");
  await assertRateLimit(db, `post-day:${actor.id}`, settings.dailyPostLimit, 24 * 3600, "Submitting");

  return db.transaction(async (tx) => {
    // Serialise this author's submissions, so several simultaneous identical requests (a double-click, a script)
    // can't all pass the duplicate check before any of them has been stored.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`post:${actor.id}`}))`);

    // The same text twice in a day (pending or live) is almost always a double-click or a spammer.
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const recent = await tx
      .select({ body: post.body })
      .from(post)
      .where(and(eq(post.authorId, actor.id), inArray(post.status, ["pending", "approved"]), sql`${post.createdAt} > ${since}`))
      .limit(40);
    const fp = fingerprint(data.body);
    if (recent.some((r) => fingerprint(r.body) === fp)) {
      throw new AppError("CONFLICT", "You already submitted that. Give the moderators a moment.");
    }

    const [row] = await tx.insert(post).values({ authorId: actor.id, body: data.body, category: data.category }).returning({ id: post.id });
    return row;
  });
}

/** Editing sends the post back through moderation, so approved posts can't be swapped for something worse. */
export async function updateOwnPost(db: AppDb, actor: Actor, id: string, input: unknown): Promise<{ id: string }> {
  assertCanParticipate(actor);
  if (!isUuid(id)) throw new AppError("NOT_FOUND", "We couldn't find that post.");
  const data = parse(postInput, input);
  const settings = await getSettings(db);
  if (!settings.submissionsOpen) throw new AppError("UNAVAILABLE", "New submissions are paused right now. Check back soon.");
  assertContentAllowed(data.body, settings);
  await assertRateLimit(db, `post-edit:${actor.id}`, 20, 3600, "Editing");

  const [updated] = await db
    .update(post)
    .set({
      body: data.body,
      category: data.category,
      status: "pending",
      editedAt: new Date(),
      moderatedById: null,
      moderatedAt: null,
      moderationNote: null,
    })
    .where(and(eq(post.id, id), eq(post.authorId, actor.id), inArray(post.status, ["pending", "rejected", "approved"])))
    .returning({ id: post.id });
  if (!updated) throw new AppError("NOT_FOUND", "That post can't be edited (it may have been removed).");
  return updated;
}

/** Authors can delete their own posts, except while a report is open or after moderators removed one. */
export async function deleteOwnPost(db: AppDb, actor: Pick<Actor, "id">, id: string): Promise<void> {
  if (!isUuid(id)) throw new AppError("NOT_FOUND", "We couldn't find that post.");
  await db.transaction(async (tx) => {
    const [row] = await tx.select({ status: post.status }).from(post).where(and(eq(post.id, id), eq(post.authorId, actor.id))).limit(1);
    if (!row) throw new AppError("NOT_FOUND", "We couldn't find that post.");
    if (row.status === "removed") throw new AppError("FORBIDDEN", "Posts removed by moderators can't be deleted.");
    const [open] = await tx
      .select({ n: count() })
      .from(report)
      .where(and(eq(report.postId, id), eq(report.status, "open")));
    if (Number(open.n) > 0) throw new AppError("CONFLICT", "This post is being reviewed after a report, so it can't be deleted yet.");
    await tx.delete(post).where(and(eq(post.id, id), eq(post.authorId, actor.id)));
  });
}

/* ------------------------------------------------------------------ */
/* Staff: queue, management and moderation decisions                  */
/* ------------------------------------------------------------------ */

export async function listPostsForStaff(
  db: Db,
  actor: Actor,
  opts: { status?: PostStatus; q?: string; authorId?: string; page?: number; oldestFirst?: boolean } = {},
): Promise<Page<StaffPostView>> {
  assertStaff(actor);
  const size = LIMITS.adminPageSize;
  const moderator = alias(user, "moderator");
  const pattern = opts.q ? `%${escapeLike(opts.q)}%` : null;
  const where = and(
    opts.status ? eq(post.status, opts.status) : undefined,
    opts.authorId ? eq(post.authorId, opts.authorId) : undefined,
    pattern ? or(ilike(post.body, pattern), ilike(user.name, pattern)) : undefined,
  );
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(post).innerJoin(user, eq(user.id, post.authorId)).where(where);
  const meta = pageMeta(n, opts.page ?? 1, size);
  const page = pageOf(opts.page, meta.pageCount);
  const rows = await db
    .select({
      ...baseColumns,
      moderatorName: moderator.name,
      moderatedAt: post.moderatedAt,
      openReports: sql<number>`(select count(*) from report r where r.post_id = ${post.id} and r.status = 'open')::int`,
    })
    .from(post)
    .innerJoin(user, eq(user.id, post.authorId))
    .leftJoin(moderator, eq(moderator.id, post.moderatedById))
    .where(where)
    .orderBy(opts.oldestFirst ? asc(post.createdAt) : desc(post.createdAt), desc(post.id))
    .limit(size)
    .offset((page - 1) * size);
  const hydrated = await hydrate(db, rows);
  const items = hydrated.map((p, i) => ({
    ...p,
    openReports: Number(rows[i].openReports),
    moderatorName: rows[i].moderatorName,
    moderatedAt: rows[i].moderatedAt,
  }));
  return { items, total: n, page, pageCount: meta.pageCount };
}

export async function getPostForStaff(db: Db, actor: Actor, id: string): Promise<PrivatePostView | null> {
  assertStaff(actor);
  if (!isUuid(id)) return null;
  const rows = await db.select(baseColumns).from(post).innerJoin(user, eq(user.id, post.authorId)).where(eq(post.id, id)).limit(1);
  return (await hydrate(db, rows))[0] ?? null;
}

const TRANSITIONS = {
  approve: { from: ["pending", "rejected"], to: "approved", action: "post_approved", notice: "post_approved" },
  reject: { from: ["pending"], to: "rejected", action: "post_rejected", notice: "post_rejected" },
  remove: { from: ["approved"], to: "removed", action: "post_removed", notice: "post_removed" },
  restore: { from: ["removed"], to: "approved", action: "post_restored", notice: "post_approved" },
} as const;

const NOTICE_TEXT = {
  approve: "Your delusion was approved and is now live in the community.",
  reject: "Your delusion wasn't approved this time.",
  remove: "A moderator removed your delusion from the community.",
  restore: "Your delusion was restored to the community.",
} as const;

/**
 * Approve, reject, remove or restore a post. One transaction: the status change, the moderation
 * history row, the audit entry and the author's notification succeed or fail together.
 * The WHERE clause on the current status makes concurrent decisions safe (second one gets CONFLICT).
 */
export async function moderatePost(db: AppDb, actor: Actor, input: unknown): Promise<{ id: string; status: PostStatus }> {
  assertStaff(actor);
  const { id, decision, note, version } = parse(moderateInput, input);
  const rule = TRANSITIONS[decision];

  return db.transaction(async (tx) => {
    const [current] = await tx.select({ id: post.id, status: post.status, authorId: post.authorId }).from(post).where(eq(post.id, id)).limit(1);
    if (!current) throw new AppError("NOT_FOUND", "We couldn't find that post.");
    // Conflict of interest: only an admin may decide on their own post.
    if (current.authorId === actor.id && actor.role !== "admin") {
      throw new AppError("FORBIDDEN", "Ask another moderator to review your own post.");
    }
    const now = new Date();
    const [updated] = await tx
      .update(post)
      .set({
        status: rule.to,
        moderatedById: actor.id,
        moderatedAt: now,
        moderationNote: note ?? null,
        ...(rule.to === "approved" ? { publishedAt: sql`coalesce(${post.publishedAt}, ${now})` } : {}),
      })
      .where(
        and(
          eq(post.id, id),
          inArray(post.status, [...rule.from]),
          version === undefined
            ? undefined
            : version === ""
              ? isNull(post.editedAt)
              : eq(post.editedAt, new Date(version)),
        ),
      )
      .returning({ id: post.id, status: post.status });
    if (!updated) {
      if (version !== undefined) {
        const [now2] = await tx.select({ editedAt: post.editedAt }).from(post).where(eq(post.id, id)).limit(1);
        const seen = now2?.editedAt ? now2.editedAt.toISOString() : "";
        if (seen !== version) throw new AppError("CONFLICT", "The author edited this post after you opened it. Refresh to review the new version.");
      }
      throw new AppError("CONFLICT", `That post is already ${current.status}. Refresh to see the latest.`);
    }
    await recordModeration(tx, actor, { action: rule.action, targetType: "post", targetId: id, targetUserId: current.authorId, note });
    await notify(tx, {
      userId: current.authorId,
      type: rule.notice,
      postId: decision === "remove" || decision === "reject" ? null : id,
      message: note ? `${NOTICE_TEXT[decision]} Note from the moderators: ${note}` : NOTICE_TEXT[decision],
    });
    return { id: updated.id, status: updated.status as PostStatus };
  });
}

export const POST_CATEGORIES = CATEGORY_KEYS;

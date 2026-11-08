import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { AppDb, Db } from "@/lib/db/types";
import { comment, post, reaction, report, session, user } from "@/lib/db/schema";
import {
  assertAdmin,
  assertCanParticipate,
  assertStaff,
  canActOnUser,
  canChangeRole,
  isAdmin,
  isStaff,
  isSuspended,
  type Actor,
} from "@/lib/platform/actor";
import { LIMITS, type PostStatus, type Role, toRole } from "@/lib/platform/constants";
import { AppError } from "@/lib/platform/errors";
import { isUserId, pageOf } from "@/lib/platform/ids";
import { assertContentAllowed } from "@/lib/platform/spam";
import { escapeLike, isReservedName } from "@/lib/platform/text";
import { parse, profileInput, roleInput, suspendInput } from "@/lib/platform/validation";
import { recordAudit, recordModeration } from "./audit";
import { notify } from "./notifications";
import { type Page } from "./posts";
import { getSettings } from "./settings";

export async function assertNameAllowed(db: Db, name: string, role: Role = "user"): Promise<void> {
  if (!isStaff(role) && isReservedName(name)) {
    throw new AppError("VALIDATION", "That name is reserved. Pick another.", { fieldErrors: { name: "That name is reserved." } });
  }
  const settings = await getSettings(db);
  assertContentAllowed(name, { allowLinks: false, blockedTerms: settings.blockedTerms }, "name");
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  return `${local.slice(0, 1)}•••@${domain}`;
}

/* ------------------------------------------------------------------ */
/* Public profiles                                                    */
/* ------------------------------------------------------------------ */

export type PublicProfile = {
  id: string;
  name: string;
  bio: string | null;
  joinedAt: Date;
  role: Role;
  approvedPosts: number;
  reactionsReceived: number;
};

/** Suspended and banned users have no public profile. Never includes the e-mail address. */
export async function getPublicProfile(db: Db, id: string): Promise<PublicProfile | null> {
  if (!isUserId(id)) return null;
  const [u] = await db
    .select({ id: user.id, name: user.name, bio: user.bio, createdAt: user.createdAt, role: user.role, banned: user.banned, banExpires: user.banExpires })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  if (!u || isSuspended(u)) return null;
  const [[posts], [reactions]] = await Promise.all([
    db.select({ n: count() }).from(post).where(and(eq(post.authorId, id), eq(post.status, "approved"))),
    db
      .select({ n: count() })
      .from(reaction)
      .innerJoin(post, eq(post.id, reaction.postId))
      .where(and(eq(post.authorId, id), eq(post.status, "approved"))),
  ]);
  return {
    id: u.id,
    name: u.name,
    bio: u.bio,
    joinedAt: u.createdAt,
    role: toRole(u.role),
    approvedPosts: Number(posts.n),
    reactionsReceived: Number(reactions.n),
  };
}

/** The signed-in user's own account details (the e-mail is only ever returned to its owner). */
export async function getOwnAccount(db: Db, userId: string): Promise<{ name: string; email: string; bio: string | null; createdAt: Date } | null> {
  const [u] = await db.select({ name: user.name, email: user.email, bio: user.bio, createdAt: user.createdAt }).from(user).where(eq(user.id, userId)).limit(1);
  return u ?? null;
}

export async function updateProfile(db: AppDb, actor: Actor, input: unknown): Promise<void> {
  assertCanParticipate(actor);
  const data = parse(profileInput, input);
  await assertNameAllowed(db, data.name, actor.role);
  if (data.bio) {
    const settings = await getSettings(db);
    assertContentAllowed(data.bio, { allowLinks: false, blockedTerms: settings.blockedTerms }, "bio");
  }
  await db.update(user).set({ name: data.name, bio: data.bio }).where(eq(user.id, actor.id));
}

/* ------------------------------------------------------------------ */
/* Staff: finding and acting on users                                 */
/* ------------------------------------------------------------------ */

export type StaffUserRow = {
  id: string;
  name: string;
  /** Full address for admins, masked for moderators. */
  email: string;
  role: Role;
  emailVerified: boolean;
  suspended: boolean;
  banned: boolean;
  banExpires: Date | null;
  banReason: string | null;
  createdAt: Date;
};

function toStaffRow(actor: Actor, r: {
  id: string; name: string; email: string; role: string; emailVerified: boolean; banned: boolean;
  banExpires: Date | null; banReason: string | null; createdAt: Date;
}): StaffUserRow {
  return {
    id: r.id,
    name: r.name,
    email: isAdmin(actor.role) ? r.email : maskEmail(r.email),
    role: toRole(r.role),
    emailVerified: r.emailVerified,
    suspended: isSuspended(r),
    banned: r.banned,
    banExpires: r.banExpires,
    banReason: r.banReason,
    createdAt: r.createdAt,
  };
}

const userColumns = {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  emailVerified: user.emailVerified,
  banned: user.banned,
  banExpires: user.banExpires,
  banReason: user.banReason,
  createdAt: user.createdAt,
};

export async function listUsers(
  db: Db,
  actor: Actor,
  opts: { q?: string; role?: Role; state?: "all" | "suspended" | "active"; page?: number } = {},
): Promise<Page<StaffUserRow>> {
  assertStaff(actor);
  const size = LIMITS.adminPageSize;
  const pattern = opts.q ? `%${escapeLike(opts.q)}%` : null;
  const now = new Date();
  const where = and(
    opts.role ? eq(user.role, opts.role) : undefined,
    opts.state === "suspended" ? and(eq(user.banned, true), or(sql`${user.banExpires} is null`, sql`${user.banExpires} > ${now}`)) : undefined,
    opts.state === "active" ? or(eq(user.banned, false), and(sql`${user.banExpires} is not null`, sql`${user.banExpires} <= ${now}`)) : undefined,
    // Only admins may search by e-mail address; moderators search by display name.
    pattern ? (isAdmin(actor.role) ? or(ilike(user.name, pattern), ilike(user.email, pattern)) : ilike(user.name, pattern)) : undefined,
  );
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(user).where(where);
  const pageCount = Math.max(1, Math.ceil(n / size));
  const page = pageOf(opts.page, pageCount);
  const rows = await db.select(userColumns).from(user).where(where).orderBy(desc(user.createdAt), desc(user.id)).limit(size).offset((page - 1) * size);
  return { items: rows.map((r) => toStaffRow(actor, r)), total: n, page, pageCount };
}

export type StaffUserDetail = StaffUserRow & {
  posts: Record<PostStatus, number>;
  comments: number;
  reactions: number;
  reportsAgainst: { open: number; total: number };
  reportsFiled: number;
};

export async function getUserDetail(db: Db, actor: Actor, id: string): Promise<StaffUserDetail | null> {
  assertStaff(actor);
  if (!isUserId(id)) return null;
  const [u] = await db.select(userColumns).from(user).where(eq(user.id, id)).limit(1);
  if (!u) return null;
  const [postRows, [c], [rx], againstRows, [filed]] = await Promise.all([
    db.select({ status: post.status, n: count() }).from(post).where(eq(post.authorId, id)).groupBy(post.status),
    db.select({ n: count() }).from(comment).where(eq(comment.authorId, id)),
    db.select({ n: count() }).from(reaction).where(eq(reaction.userId, id)),
    db.select({ status: report.status, n: count() }).from(report).where(eq(report.targetAuthorId, id)).groupBy(report.status),
    db.select({ n: count() }).from(report).where(eq(report.reporterId, id)),
  ]);
  const posts: Record<PostStatus, number> = { pending: 0, approved: 0, rejected: 0, removed: 0 };
  for (const r of postRows) posts[r.status as PostStatus] = Number(r.n);
  const open = Number(againstRows.find((r) => r.status === "open")?.n ?? 0);
  const total = againstRows.reduce((a, r) => a + Number(r.n), 0);
  return { ...toStaffRow(actor, u), posts, comments: Number(c.n), reactions: Number(rx.n), reportsAgainst: { open, total }, reportsFiled: Number(filed.n) };
}

export async function listStaffMembers(db: Db, actor: Actor): Promise<StaffUserRow[]> {
  assertAdmin(actor);
  const rows = await db.select(userColumns).from(user).where(inArray(user.role, ["moderator", "admin"])).orderBy(user.role, user.name);
  return rows.map((r) => toStaffRow(actor, r));
}

/** Suspend (timed) or ban (permanent) a user, end their sessions and record why. */
export async function suspendUser(db: AppDb, actor: Actor, input: unknown): Promise<void> {
  assertStaff(actor);
  const { userId, mode, days, reason } = parse(suspendInput, input);
  const length = mode === "suspend" ? (days ?? 7) : null;
  await db.transaction(async (tx) => {
    const [target] = await tx.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, userId)).limit(1);
    if (!target) throw new AppError("NOT_FOUND", "We couldn't find that user.");
    if (!canActOnUser(actor, { id: target.id, role: toRole(target.role) })) {
      throw new AppError("FORBIDDEN", "You can't suspend or ban that account.");
    }
    const expires = length ? new Date(Date.now() + length * 24 * 3600 * 1000) : null;
    await tx.update(user).set({ banned: true, banReason: reason, banExpires: expires }).where(eq(user.id, userId));
    await tx.delete(session).where(eq(session.userId, userId)); // sign them out everywhere, immediately
    await recordModeration(tx, actor, {
      action: mode === "ban" ? "user_banned" : "user_suspended",
      targetType: "user",
      targetId: userId,
      targetUserId: userId,
      note: reason,
    });
    await notify(tx, {
      userId,
      type: "account_suspended",
      message:
        mode === "ban"
          ? `Your account was banned. Reason: ${reason}`
          : `Your account was suspended for ${length} day${length === 1 ? "" : "s"}. Reason: ${reason}`,
    });
  });
}

export async function restoreUser(db: AppDb, actor: Actor, userId: string): Promise<void> {
  assertStaff(actor);
  if (!isUserId(userId)) throw new AppError("NOT_FOUND", "We couldn't find that user.");
  await db.transaction(async (tx) => {
    const [target] = await tx.select({ id: user.id, role: user.role, banned: user.banned }).from(user).where(eq(user.id, userId)).limit(1);
    if (!target) throw new AppError("NOT_FOUND", "We couldn't find that user.");
    if (!canActOnUser(actor, { id: target.id, role: toRole(target.role) })) {
      throw new AppError("FORBIDDEN", "You can't restore that account.");
    }
    if (!target.banned) throw new AppError("CONFLICT", "That account isn't suspended.");
    await tx.update(user).set({ banned: false, banReason: null, banExpires: null }).where(eq(user.id, userId));
    await recordModeration(tx, actor, { action: "user_restored", targetType: "user", targetId: userId, targetUserId: userId });
    await notify(tx, { userId, type: "account_restored", message: "Your account was restored. Welcome back." });
  });
}

/** Admin only. Never your own role, and the change is written to the audit log. */
export async function setUserRole(db: AppDb, actor: Actor, input: unknown): Promise<void> {
  assertAdmin(actor);
  const { userId, role } = parse(roleInput, input);
  await db.transaction(async (tx) => {
    // Serialise every role change, then trust the DATABASE, not the actor object: that object was read at the
    // start of the request, and the admin may have been demoted since (or by a simultaneous request).
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('grade-delusion:admins'))`);
    const [fresh] = await tx
      .select({ role: user.role, emailVerified: user.emailVerified, banned: user.banned, banExpires: user.banExpires })
      .from(user)
      .where(eq(user.id, actor.id))
      .limit(1);
    if (!fresh) throw new AppError("FORBIDDEN", "Only admins can do that.");
    assertAdmin({ ...actor, role: toRole(fresh.role), emailVerified: fresh.emailVerified, banned: fresh.banned, banExpires: fresh.banExpires });

    const [target] = await tx.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, userId)).limit(1);
    if (!target) throw new AppError("NOT_FOUND", "We couldn't find that user.");
    const from = toRole(target.role);
    if (actor.id === target.id) throw new AppError("FORBIDDEN", "You can't change your own role.");
    if (!canChangeRole(actor, { id: target.id, role: from }, role)) {
      throw new AppError("CONFLICT", `That user is already ${role === "user" ? "a regular user" : `a ${role}`}.`);
    }
    if (from === "admin" && role !== "admin") {
      const [others] = await tx.select({ n: sql<number>`count(*)::int` }).from(user).where(and(eq(user.role, "admin"), sql`${user.id} <> ${target.id}`));
      if (Number(others.n) < 1) throw new AppError("FORBIDDEN", "The platform must keep at least one admin.");
    }
    await tx.update(user).set({ role }).where(eq(user.id, userId));
    await recordAudit(tx, { actor, action: "user.role_changed", targetType: "user", targetId: userId, details: { from, to: role } });
    await notify(tx, {
      userId,
      type: "role_changed",
      message: role === "user" ? "You are no longer a moderator." : `You are now ${role === "admin" ? "an admin" : "a moderator"} on Grade Delusion.`,
    });
  });
}

/* ------------------------------------------------------------------ */
/* A user's own activity history                                      */
/* ------------------------------------------------------------------ */

export type ActivityItem = {
  kind: "post" | "comment" | "reaction" | "report";
  at: Date;
  text: string;
  postId: string | null;
  status?: string;
};

export async function listActivity(db: Db, actorId: string, limit = 40): Promise<ActivityItem[]> {
  const take = Math.min(limit, 40);
  const [posts, comments, reactions, reports] = await Promise.all([
    db.select({ id: post.id, body: post.body, status: post.status, at: post.createdAt }).from(post).where(eq(post.authorId, actorId)).orderBy(desc(post.createdAt)).limit(take),
    db
      .select({ postId: comment.postId, body: comment.body, status: comment.status, at: comment.createdAt })
      .from(comment)
      .where(eq(comment.authorId, actorId))
      .orderBy(desc(comment.createdAt))
      .limit(take),
    db
      .select({ postId: reaction.postId, kind: reaction.kind, at: reaction.createdAt, body: post.body })
      .from(reaction)
      .innerJoin(post, eq(post.id, reaction.postId))
      .where(and(eq(reaction.userId, actorId), eq(post.status, "approved")))
      .orderBy(desc(reaction.createdAt))
      .limit(take),
    db
      .select({ postId: report.postId, reason: report.reason, status: report.status, at: report.createdAt })
      .from(report)
      .where(eq(report.reporterId, actorId))
      .orderBy(desc(report.createdAt))
      .limit(take),
  ]);
  const clip = (s: string) => (s.length > 90 ? `${s.slice(0, 89)}…` : s);
  const items: ActivityItem[] = [
    ...posts.map((p): ActivityItem => ({ kind: "post", at: p.at, text: `Submitted “${clip(p.body)}”`, postId: p.id, status: p.status })),
    ...comments.map((c): ActivityItem => ({
      kind: "comment",
      at: c.at,
      text: c.status === "removed" ? "Commented (removed by a moderator)" : `Commented “${clip(c.body)}”`,
      postId: c.postId,
      status: c.status,
    })),
    ...reactions.map((r): ActivityItem => ({ kind: "reaction", at: r.at, text: `Reacted “${r.kind}” to “${clip(r.body)}”`, postId: r.postId })),
    ...reports.map((r): ActivityItem => ({ kind: "report", at: r.at, text: `Reported something (${r.reason.replace("_", " ")})`, postId: r.postId, status: r.status })),
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, take);
}

export { isStaff };

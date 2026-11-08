import { and, desc, eq, ilike, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/types";
import { auditLog, moderationAction, user } from "@/lib/db/schema";
import { assertAdmin, assertStaff, type Actor } from "@/lib/platform/actor";
import type { ModerationActionType, ModerationTarget } from "@/lib/platform/constants";
import { LIMITS } from "@/lib/platform/constants";
import { pageOf } from "@/lib/platform/ids";
import { escapeLike } from "@/lib/platform/text";

type Who = Pick<Actor, "id" | "role"> | null | undefined;

/** Append one row to the audit log. Never put post text, e-mail addresses or secrets in `details`. */
export async function recordAudit(
  db: Db,
  e: { actor?: Who; action: string; targetType?: string; targetId?: string; details?: Record<string, unknown> },
): Promise<void> {
  await db.insert(auditLog).values({
    actorId: e.actor?.id ?? null,
    actorRole: e.actor?.role ?? null,
    action: e.action,
    targetType: e.targetType ?? null,
    targetId: e.targetId ?? null,
    details: e.details ?? {},
  });
}

/** A moderation decision: written to the moderation history AND the audit log, in the caller's transaction. */
export async function recordModeration(
  db: Db,
  actor: Pick<Actor, "id" | "name" | "role">,
  e: { action: ModerationActionType; targetType: ModerationTarget; targetId: string; targetUserId?: string | null; note?: string },
): Promise<void> {
  await db.insert(moderationAction).values({
    actorId: actor.id,
    actorName: actor.name,
    action: e.action,
    targetType: e.targetType,
    targetId: e.targetId,
    targetUserId: e.targetUserId ?? null,
    note: e.note ?? null,
  });
  await recordAudit(db, {
    actor,
    action: `moderation.${e.action}`,
    targetType: e.targetType,
    targetId: e.targetId,
    details: { targetUserId: e.targetUserId ?? null, hasNote: Boolean(e.note) },
  });
}

export type AuditRow = {
  id: string;
  createdAt: Date;
  action: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
};

/** Admin only: the audit log, newest first, filterable by action prefix. */
export async function listAudit(
  db: Db,
  actor: Actor,
  opts: { action?: string; actorId?: string; page?: number } = {},
): Promise<{ rows: AuditRow[]; total: number; page: number; pageCount: number }> {
  assertAdmin(actor);
  const where = and(
    opts.action ? ilike(auditLog.action, `${escapeLike(opts.action)}%`) : undefined,
    opts.actorId ? eq(auditLog.actorId, opts.actorId) : undefined,
  );
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(auditLog).where(where);
  const pageCount = Math.max(1, Math.ceil(n / LIMITS.adminPageSize));
  const page = pageOf(opts.page, pageCount);
  const rows = await db
    .select({
      id: auditLog.id,
      createdAt: auditLog.createdAt,
      action: auditLog.action,
      actorId: auditLog.actorId,
      actorName: user.name,
      actorRole: auditLog.actorRole,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      details: auditLog.details,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .where(where)
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(LIMITS.adminPageSize)
    .offset((page - 1) * LIMITS.adminPageSize);
  return { rows, total: n, page, pageCount };
}

export type ModerationHistoryRow = {
  id: string;
  createdAt: Date;
  action: ModerationActionType;
  actorName: string;
  note: string | null;
  targetType: string;
  targetId: string;
};

/** Moderation history for one post, comment or user. Staff only. */
export async function listModerationHistory(
  db: Db,
  actor: Actor,
  target: { type: ModerationTarget; id: string },
  limit = 30,
): Promise<ModerationHistoryRow[]> {
  assertStaff(actor);
  const where =
    target.type === "user"
      ? eq(moderationAction.targetUserId, target.id)
      : and(eq(moderationAction.targetType, target.type), eq(moderationAction.targetId, target.id));
  const rows = await db
    .select({
      id: moderationAction.id,
      createdAt: moderationAction.createdAt,
      action: moderationAction.action,
      actorName: moderationAction.actorName,
      note: moderationAction.note,
      targetType: moderationAction.targetType,
      targetId: moderationAction.targetId,
    })
    .from(moderationAction)
    .where(where)
    .orderBy(desc(moderationAction.createdAt))
    .limit(limit);
  return rows as ModerationHistoryRow[];
}

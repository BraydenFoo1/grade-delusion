import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/types";
import { notification } from "@/lib/db/schema";
import { LIMITS, type NotificationType } from "@/lib/platform/constants";
import { isUuid, pageOf } from "@/lib/platform/ids";

export type NewNotification = {
  userId: string;
  type: NotificationType;
  message: string;
  actorId?: string | null;
  postId?: string | null;
  commentId?: string | null;
};

/** Create a notification. Notifying yourself about your own action is skipped. */
export async function notify(db: Db, n: NewNotification): Promise<void> {
  if (n.actorId && n.actorId === n.userId) return;
  await db.insert(notification).values({
    userId: n.userId,
    type: n.type,
    message: n.message.slice(0, 280),
    actorId: n.actorId ?? null,
    postId: n.postId ?? null,
    commentId: n.commentId ?? null,
  });
}

export type NotificationRow = {
  id: string;
  type: NotificationType;
  message: string;
  postId: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export async function listNotifications(
  db: Db,
  userId: string,
  opts: { page?: number; unreadOnly?: boolean } = {},
): Promise<{ rows: NotificationRow[]; total: number; page: number; pageCount: number }> {
  const where = and(eq(notification.userId, userId), opts.unreadOnly ? isNull(notification.readAt) : undefined);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(notification).where(where);
  const pageCount = Math.max(1, Math.ceil(n / LIMITS.pageSize));
  const page = pageOf(opts.page, pageCount);
  const rows = await db
    .select({
      id: notification.id,
      type: notification.type,
      message: notification.message,
      postId: notification.postId,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    })
    .from(notification)
    .where(where)
    .orderBy(desc(notification.createdAt), desc(notification.id))
    .limit(LIMITS.pageSize)
    .offset((page - 1) * LIMITS.pageSize);
  return { rows: rows as NotificationRow[], total: n, page, pageCount };
}

export async function unreadCount(db: Db, userId: string): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
  return n;
}

/** Marks one notification read. The user id is part of the WHERE, so nobody can touch someone else's. */
export async function markRead(db: Db, userId: string, id: string): Promise<void> {
  if (!isUuid(id)) return; // not a notification id: nothing to mark (and no reason to hit the database)
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.id, id), eq(notification.userId, userId), isNull(notification.readAt)));
}

export async function markAllRead(db: Db, userId: string): Promise<void> {
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
}

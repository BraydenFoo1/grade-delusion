import { count, eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/types";
import { comment, moderationAction, post, reaction, report, user } from "@/lib/db/schema";
import { assertStaff, type Actor } from "@/lib/platform/actor";
import type { PostStatus } from "@/lib/platform/constants";

export type SeriesPoint = { date: string; value: number };

export type Overview = {
  users: { total: number; verified: number; suspended: number; newThisWeek: number; staff: number };
  posts: Record<PostStatus, number> & { total: number };
  comments: { visible: number; removed: number };
  reactions: number;
  reports: { open: number; total: number };
  queue: { pending: number; oldestPendingAt: Date | null };
  series: { signups: SeriesPoint[]; submissions: SeriesPoint[]; approvals: SeriesPoint[]; reports: SeriesPoint[] };
  days: number;
};

const DAY = 24 * 3600 * 1000;

/** `days` consecutive UTC dates ending today, so charts have no gaps. */
function lastDays(days: number, now: Date): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(new Date(now.getTime() - i * DAY).toISOString().slice(0, 10));
  return out;
}

async function dailyCounts(db: Db, table: string, column: string, days: number, extraWhere = sql`true`): Promise<Map<string, number>> {
  // `table` and `column` are internal constants, never user input.
  const res = await db.execute(sql`
    select to_char(date_trunc('day', ${sql.identifier(column)} at time zone 'UTC'), 'YYYY-MM-DD') as d, count(*)::int as n
    from ${sql.identifier(table)}
    where ${sql.identifier(column)} >= now() - (${days} || ' days')::interval and ${extraWhere}
    group by 1
  `);
  return new Map((res.rows as { d: string; n: number }[]).map((r) => [r.d, Number(r.n)]));
}

export async function getOverview(db: Db, actor: Actor, days = 14, now = new Date()): Promise<Overview> {
  assertStaff(actor);
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const [
    [u],
    [verified],
    [staff],
    [recent],
    [suspended],
    postRows,
    [cVisible],
    [cRemoved],
    [rx],
    reportRows,
    [oldest],
  ] = await Promise.all([
    db.select({ n: count() }).from(user),
    db.select({ n: count() }).from(user).where(eq(user.emailVerified, true)),
    db.select({ n: count() }).from(user).where(sql`${user.role} in ('moderator','admin')`),
    db.select({ n: count() }).from(user).where(sql`${user.createdAt} >= ${weekAgo}`),
    db.select({ n: count() }).from(user).where(sql`${user.banned} = true and (${user.banExpires} is null or ${user.banExpires} > ${now})`),
    db.select({ status: post.status, n: count() }).from(post).groupBy(post.status),
    db.select({ n: count() }).from(comment).where(eq(comment.status, "visible")),
    db.select({ n: count() }).from(comment).where(eq(comment.status, "removed")),
    db.select({ n: count() }).from(reaction),
    db.select({ status: report.status, n: count() }).from(report).groupBy(report.status),
    db.select({ at: sql<Date | null>`min(${post.createdAt})` }).from(post).where(eq(post.status, "pending")),
  ]);

  const posts = { pending: 0, approved: 0, rejected: 0, removed: 0, total: 0 } as Overview["posts"];
  for (const r of postRows) {
    posts[r.status as PostStatus] = Number(r.n);
    posts.total += Number(r.n);
  }
  const reportTotal = reportRows.reduce((a, r) => a + Number(r.n), 0);

  const [signups, submissions, approvals, reports] = await Promise.all([
    dailyCounts(db, "user", "created_at", days),
    dailyCounts(db, "post", "created_at", days),
    dailyCounts(db, "moderation_action", "created_at", days, sql`action = 'post_approved'`),
    dailyCounts(db, "report", "created_at", days),
  ]);
  const dates = lastDays(days, now);
  const toSeries = (m: Map<string, number>): SeriesPoint[] => dates.map((date) => ({ date, value: m.get(date) ?? 0 }));
  void moderationAction;

  return {
    users: { total: Number(u.n), verified: Number(verified.n), suspended: Number(suspended.n), newThisWeek: Number(recent.n), staff: Number(staff.n) },
    posts,
    comments: { visible: Number(cVisible.n), removed: Number(cRemoved.n) },
    reactions: Number(rx.n),
    reports: { open: Number(reportRows.find((r) => r.status === "open")?.n ?? 0), total: reportTotal },
    queue: { pending: posts.pending, oldestPendingAt: oldest?.at ? new Date(oldest.at) : null },
    series: { signups: toSeries(signups), submissions: toSeries(submissions), approvals: toSeries(approvals), reports: toSeries(reports) },
    days,
  };
}

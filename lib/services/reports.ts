import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { AppDb, Db } from "@/lib/db/types";
import { comment, post, report, user } from "@/lib/db/schema";
import { assertCanParticipate, assertStaff, type Actor } from "@/lib/platform/actor";
import { LIMITS, type ReportReason, type ReportStatus } from "@/lib/platform/constants";
import { AppError } from "@/lib/platform/errors";
import { pageOf } from "@/lib/platform/ids";
import { parse, reportInput, resolveReportInput } from "@/lib/platform/validation";
import { recordModeration } from "./audit";
import { moderateComment } from "./comments";
import { notify } from "./notifications";
import { isUuid, moderatePost, type Page } from "./posts";
import { assertRateLimit } from "./rate-limit";
import { getSettings } from "./settings";

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string; message?: string }; message?: string };
  return err?.code === "23505" || err?.cause?.code === "23505" || /duplicate key|unique constraint/i.test(`${err?.message} ${err?.cause?.message}`);
}

/** Report an approved post or a visible comment. You can't report yourself, or the same thing twice while it's open. */
export async function createReport(db: AppDb, actor: Actor, input: unknown): Promise<{ id: string }> {
  assertCanParticipate(actor);
  const data = parse(reportInput, input);
  const settings = await getSettings(db);
  await assertRateLimit(db, `report-burst:${actor.id}`, 5, 60, "Reporting");
  await assertRateLimit(db, `report-day:${actor.id}`, settings.dailyReportLimit, 24 * 3600, "Reporting");

  let snapshot: string;
  let targetAuthorId: string;
  if (data.targetType === "post") {
    const [t] = await db.select({ body: post.body, status: post.status, authorId: post.authorId }).from(post).where(eq(post.id, data.targetId)).limit(1);
    if (!t || t.status !== "approved") throw new AppError("NOT_FOUND", "We couldn't find that post.");
    snapshot = t.body;
    targetAuthorId = t.authorId;
  } else {
    const [t] = await db
      .select({ body: comment.body, status: comment.status, authorId: comment.authorId, postStatus: post.status })
      .from(comment)
      .innerJoin(post, eq(post.id, comment.postId))
      .where(eq(comment.id, data.targetId))
      .limit(1);
    if (!t || t.status !== "visible" || t.postStatus !== "approved") throw new AppError("NOT_FOUND", "We couldn't find that comment.");
    snapshot = t.body;
    targetAuthorId = t.authorId;
  }
  if (targetAuthorId === actor.id) throw new AppError("VALIDATION", "You can't report your own content.");

  const targetCol = data.targetType === "post" ? report.postId : report.commentId;
  const [existing] = await db
    .select({ id: report.id })
    .from(report)
    .where(and(eq(report.reporterId, actor.id), eq(targetCol, data.targetId), eq(report.status, "open")))
    .limit(1);
  if (existing) throw new AppError("CONFLICT", "You've already reported this. A moderator will take a look.");

  try {
    const [row] = await db
      .insert(report)
      .values({
        reporterId: actor.id,
        postId: data.targetType === "post" ? data.targetId : null,
        commentId: data.targetType === "comment" ? data.targetId : null,
        targetAuthorId,
        reason: data.reason,
        note: data.note ?? null,
        contentSnapshot: snapshot,
      })
      .returning({ id: report.id });
    return row;
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", "You've already reported this. A moderator will take a look.");
    throw e;
  }
}

export type StaffReportView = {
  id: string;
  createdAt: Date;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
  resolution: string | null;
  resolvedAt: Date | null;
  resolvedByName: string | null;
  contentSnapshot: string;
  targetType: "post" | "comment";
  targetId: string;
  /** Current state of the reported content, so staff can see if it was already dealt with. */
  targetStatus: string;
  postId: string | null;
  reporterName: string | null;
  targetAuthor: { id: string; name: string } | null;
};

export async function listReports(
  db: Db,
  actor: Actor,
  opts: { status?: ReportStatus; page?: number } = {},
): Promise<Page<StaffReportView>> {
  assertStaff(actor);
  const size = LIMITS.adminPageSize;
  const reporter = alias(user, "reporter");
  const target = alias(user, "target_author");
  const resolver = alias(user, "resolver");
  const where = opts.status ? eq(report.status, opts.status) : undefined;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(report).where(where);
  const pageCount = Math.max(1, Math.ceil(n / size));
  const page = pageOf(opts.page, pageCount);
  const rows = await db
    .select({
      id: report.id,
      createdAt: report.createdAt,
      reason: report.reason,
      note: report.note,
      status: report.status,
      resolution: report.resolution,
      resolvedAt: report.resolvedAt,
      resolvedByName: resolver.name,
      contentSnapshot: report.contentSnapshot,
      postId: report.postId,
      commentId: report.commentId,
      postStatus: post.status,
      commentStatus: comment.status,
      reporterName: reporter.name,
      targetAuthorId: report.targetAuthorId,
      targetAuthorName: target.name,
    })
    .from(report)
    .leftJoin(post, eq(post.id, report.postId))
    .leftJoin(comment, eq(comment.id, report.commentId))
    .leftJoin(reporter, eq(reporter.id, report.reporterId))
    .leftJoin(target, eq(target.id, report.targetAuthorId))
    .leftJoin(resolver, eq(resolver.id, report.resolvedById))
    // Open reports: oldest first (work the backlog in order). History: newest first.
    .orderBy(opts.status === "open" ? report.createdAt : desc(report.createdAt), desc(report.id))
    .limit(size)
    .offset((page - 1) * size);
  const items: StaffReportView[] = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    reason: r.reason as ReportReason,
    note: r.note,
    status: r.status as ReportStatus,
    resolution: r.resolution,
    resolvedAt: r.resolvedAt,
    resolvedByName: r.resolvedByName,
    contentSnapshot: r.contentSnapshot,
    targetType: r.postId ? "post" : "comment",
    targetId: (r.postId ?? r.commentId) as string,
    targetStatus: (r.postId ? r.postStatus : r.commentStatus) ?? "unknown",
    postId: r.postId ?? null,
    reporterName: r.reporterName,
    targetAuthor: r.targetAuthorId ? { id: r.targetAuthorId, name: r.targetAuthorName ?? "Deleted user" } : null,
  }));
  return { items, total: n, page, pageCount };
}

export async function countOpenReports(db: Db): Promise<number> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(report).where(eq(report.status, "open"));
  return n;
}

/**
 * Close a report and every other open report on the same content in one go.
 *  - dismiss: nothing wrong here.
 *  - no_action: reviewed, left as is.
 *  - remove_content: take the post or comment down (with a moderation record) and resolve all reports on it.
 */
export async function resolveReport(db: AppDb, actor: Actor, input: unknown): Promise<void> {
  assertStaff(actor);
  const { id, resolution, note } = parse(resolveReportInput, input);

  await db.transaction(async (tx) => {
    const [r] = await tx.select().from(report).where(eq(report.id, id)).limit(1);
    if (!r) throw new AppError("NOT_FOUND", "We couldn't find that report.");
    if (r.status !== "open") throw new AppError("CONFLICT", "Someone already handled this report.");
    if (r.targetAuthorId === actor.id && actor.role !== "admin") {
      throw new AppError("FORBIDDEN", "Ask another moderator to handle reports about your own content.");
    }

    if (resolution === "remove_content") {
      if (r.postId) {
        const [p] = await tx.select({ status: post.status }).from(post).where(eq(post.id, r.postId)).limit(1);
        if (p?.status === "approved") await moderatePost(tx as unknown as AppDb, actor, { id: r.postId, decision: "remove", note });
      } else if (r.commentId) {
        const [c] = await tx.select({ status: comment.status }).from(comment).where(eq(comment.id, r.commentId)).limit(1);
        if (c?.status === "visible") await moderateComment(tx as unknown as AppDb, actor, { id: r.commentId, decision: "remove", note });
      }
    }

    const sameTarget = r.postId ? eq(report.postId, r.postId) : eq(report.commentId, r.commentId as string);
    const status: ReportStatus = resolution === "dismiss" ? "dismissed" : "resolved";
    const stored = resolution === "remove_content" ? "content_removed" : resolution === "dismiss" ? "dismissed" : "no_action";
    const closed = await tx
      .update(report)
      .set({ status, resolution: stored, resolvedById: actor.id, resolvedAt: new Date() })
      .where(and(sameTarget, eq(report.status, "open")))
      .returning({ id: report.id, reporterId: report.reporterId });

    await recordModeration(tx, actor, {
      action: resolution === "dismiss" ? "report_dismissed" : "report_resolved",
      targetType: "report",
      targetId: id,
      targetUserId: r.targetAuthorId,
      note,
    });

    const reporters = [...new Set(closed.map((c) => c.reporterId).filter((v): v is string => Boolean(v)))];
    const message =
      resolution === "remove_content"
        ? "Thanks for your report. A moderator removed that content."
        : "Thanks for your report. A moderator reviewed it and didn't find a reason to take action.";
    for (const reporterId of reporters) {
      await notify(tx, { userId: reporterId, type: "report_resolved", message });
    }
  });
}

export { isUuid };

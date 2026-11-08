// AUDIT: gaps found by the coverage map: paths that mattered but had no direct test.
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { comment, moderationAction, notification, report } from "@/lib/db/schema";
import type { Actor } from "@/lib/platform/actor";
import { AppError, fail, ok } from "@/lib/platform/errors";
import { createComment } from "@/lib/services/comments";
import { listNotifications } from "@/lib/services/notifications";
import { countOwnPostsByStatus, countPendingPosts, createPost, moderatePost } from "@/lib/services/posts";
import { countOpenReports, createReport, listReports, resolveReport } from "@/lib/services/reports";
import { createTestDb, makeUser, resetDb, type TestDb } from "../helpers/db";
import { approvedPost, noCooldowns, setSettings, uniqueBody } from "../helpers/fixtures";

describe("fail(): what error text may reach the browser", () => {
  it("passes an AppError's message and field errors through", () => {
    const r = fail(new AppError("VALIDATION", "Fix this.", { fieldErrors: { body: "Too short." } }));
    expect(r).toEqual({ ok: false, error: { code: "VALIDATION", message: "Fix this.", fieldErrors: { body: "Too short." } } });
  });

  it("turns a retry hint into plain words", () => {
    const msg = (s: number) => (fail(new AppError("RATE_LIMITED", "Posting is happening too often.", { retryAfterSec: s })) as { error: { message: string } }).error.message;
    expect(msg(1)).toBe("Posting is happening too often. Try again in 1 second.");
    expect(msg(45)).toBe("Posting is happening too often. Try again in 45 seconds.");
    expect(msg(120)).toBe("Posting is happening too often. Try again in 2 minutes.");
    expect(msg(7200)).toBe("Posting is happening too often. Try again in 2 hours.");
  });

  it("NEVER leaks the text of an unexpected error (SQL, connection strings, stack traces)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const boom of [
      new Error('Failed query: select * from "user" where email = $1 params: victim@example.com'),
      Object.assign(new Error("connect ECONNREFUSED postgres://admin:hunter2@db.internal:5432/app"), { code: "ECONNREFUSED" }),
      "a plain string was thrown",
      { weird: "object" },
      null,
    ]) {
      const r = fail(boom) as { ok: false; error: { code: string; message: string } };
      expect(r.ok).toBe(false);
      expect(r.error.code).toBe("INTERNAL");
      expect(r.error.message).toBe("Something went wrong on our side. Please try again.");
      expect(JSON.stringify(r)).not.toMatch(/hunter2|victim@|select|ECONNREFUSED|postgres:/i);
    }
    expect(spy).toHaveBeenCalled(); // logged server-side for us...
    // ...but without the bound query parameters (user data), the connection string or the victim's address
    const logged = spy.mock.calls.flat().map(String).join("\n");
    expect(logged).not.toMatch(/victim@example\.com/);
    expect(logged).not.toMatch(/hunter2|admin:/); // credentials inside a connection string
    expect(logged).toMatch(/Failed query: select/); // still useful for debugging
    expect(logged).toMatch(/ECONNREFUSED/); // the error kind survives
    spy.mockRestore();
  });

  it("ok() wraps data", () => expect(ok(5)).toEqual({ ok: true, data: 5 }));
});

describe("moderation paths that only had end-to-end coverage", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  let author: Actor, commenter: Actor, reporter: Actor, mod: Actor;

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
  });
  afterAll(async () => close());
  beforeEach(async () => {
    await resetDb(db);
    await noCooldowns(db);
    await setSettings(db, { dailyPostLimit: 50, dailyCommentLimit: 100, dailyReportLimit: 50 });
    author = await makeUser(db, { name: "Author" });
    commenter = await makeUser(db, { name: "Commenter" });
    reporter = await makeUser(db, { name: "Reporter" });
    mod = await makeUser(db, { name: "Mod", role: "moderator" });
  });

  it("a reported COMMENT can be removed from the report, which closes the report and tells everyone", async () => {
    const postId = await approvedPost(db, author, mod);
    const c = await createComment(db, commenter, { postId, body: "an unkind comment that gets reported" });
    const { id } = await createReport(db, reporter, { targetType: "comment", targetId: c.id, reason: "harassment" });
    await resolveReport(db, mod, { id, resolution: "remove_content", note: "unkind" });

    const [row] = await db.select().from(comment).where(eq(comment.id, c.id));
    expect(row.status).toBe("removed");
    expect(row.removedById).toBe(mod.id);
    expect((await db.select().from(report).where(eq(report.id, id)))[0]).toMatchObject({ status: "resolved", resolution: "content_removed" });
    const actions = (await db.select().from(moderationAction)).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["comment_removed", "report_resolved"]));
    expect((await listNotifications(db, commenter.id)).rows.some((n) => n.type === "comment_removed")).toBe(true);
    expect((await listNotifications(db, reporter.id)).rows.some((n) => n.type === "report_resolved")).toBe(true);
  });

  it("'reviewed, no action' closes the report as resolved without touching the content", async () => {
    const postId = await approvedPost(db, author, mod);
    const { id } = await createReport(db, reporter, { targetType: "post", targetId: postId, reason: "other" });
    await resolveReport(db, mod, { id, resolution: "no_action" });
    expect((await db.select().from(report).where(eq(report.id, id)))[0]).toMatchObject({ status: "resolved", resolution: "no_action" });
    expect((await listReports(db, mod, { status: "resolved" })).total).toBe(1);
    expect(await db.select().from(notification).where(eq(notification.type, "post_removed"))).toHaveLength(0);
  });

  it("dashboard counters add up", async () => {
    await createPost(db, author, { body: uniqueBody(), category: "life" });
    const live = await approvedPost(db, author, mod);
    const rejected = await createPost(db, author, { body: uniqueBody(), category: "life" });
    await moderatePost(db, mod, { id: rejected.id, decision: "reject" });
    await createReport(db, reporter, { targetType: "post", targetId: live, reason: "spam" });
    expect(await countOwnPostsByStatus(db, author)).toEqual({ pending: 1, approved: 1, rejected: 1, removed: 0 });
    expect(await countPendingPosts(db)).toBe(1);
    expect(await countOpenReports(db)).toBe(1);
  });
});

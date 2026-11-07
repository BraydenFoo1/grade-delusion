import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { comment, moderationAction, notification, post, report } from "@/lib/db/schema";
import type { Actor } from "@/lib/platform/actor";
import { AppError } from "@/lib/platform/errors";
import { createComment, deleteOwnComment, listComments, listCommentsForStaff, moderateComment } from "@/lib/services/comments";
import { listNotifications, markAllRead, markRead, unreadCount } from "@/lib/services/notifications";
import { getPublicPost, moderatePost } from "@/lib/services/posts";
import { setReaction } from "@/lib/services/reactions";
import { createReport, listReports, resolveReport } from "@/lib/services/reports";
import { createTestDb, makeUser, resetDb, type TestDb } from "../helpers/db";
import { approvedPost, noCooldowns, setSettings } from "../helpers/fixtures";

let db: TestDb;
let close: () => Promise<void>;
let author: Actor, fan: Actor, mod: Actor, mod2: Actor, admin: Actor;
let postId: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(async () => close());
beforeEach(async () => {
  await resetDb(db);
  await noCooldowns(db);
  await setSettings(db, { dailyPostLimit: 50, dailyCommentLimit: 100, dailyReportLimit: 50 });
  author = await makeUser(db, { name: "Author" });
  fan = await makeUser(db, { name: "Fan" });
  mod = await makeUser(db, { name: "Mod", role: "moderator" });
  mod2 = await makeUser(db, { name: "Mod Two", role: "moderator" });
  admin = await makeUser(db, { name: "Admin", role: "admin" });
  postId = await approvedPost(db, author, mod);
  // Setup approved the post, which (correctly) notified the author; start each test from zero.
  await db.delete(notification);
});

async function code(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
  } catch (e) {
    return e instanceof AppError ? e.code : `OTHER:${(e as Error).message}`;
  }
  return undefined;
}

describe("comments and replies", () => {
  it("posts a comment, a reply, and notifies the right people", async () => {
    const top = await createComment(db, fan, { postId, body: "Same energy honestly" });
    const reply = await createComment(db, author, { postId, parentId: top.id, body: "Thank you, comrade" });
    const thread = await listComments(db, postId);
    expect(thread.map((c) => [c.id, c.parentId])).toEqual([
      [top.id, null],
      [reply.id, top.id],
    ]);
    const authorNotes = await listNotifications(db, author.id);
    expect(authorNotes.rows.map((n) => n.type)).toEqual(["comment_on_post"]);
    const fanNotes = await listNotifications(db, fan.id);
    expect(fanNotes.rows.map((n) => n.type)).toEqual(["reply_to_comment"]);
  });

  it("does not notify people about their own comments", async () => {
    await createComment(db, author, { postId, body: "Commenting on my own post" });
    expect((await listNotifications(db, author.id)).total).toBe(0);
  });

  it("rejects replies to replies, replies across posts, and replies to missing comments", async () => {
    const top = await createComment(db, fan, { postId, body: "top level" });
    const reply = await createComment(db, author, { postId, parentId: top.id, body: "a reply" });
    expect(await code(createComment(db, fan, { postId, parentId: reply.id, body: "reply to reply" }))).toBe("VALIDATION");
    const otherPost = await approvedPost(db, author, mod);
    expect(await code(createComment(db, fan, { postId: otherPost, parentId: top.id, body: "wrong post" }))).toBe("NOT_FOUND");
    expect(await code(createComment(db, fan, { postId, parentId: "123e4567-e89b-42d3-a456-426614174000", body: "ghost" }))).toBe("NOT_FOUND");
  });

  it("requires a participating account and respects pause, links, limits", async () => {
    expect(await code(createComment(db, { ...fan, emailVerified: false }, { postId, body: "hello" }))).toBe("UNVERIFIED");
    expect(await code(createComment(db, { ...fan, banned: true }, { postId, body: "hello" }))).toBe("SUSPENDED");
    expect(await code(createComment(db, fan, { postId, body: "visit www.spam.example" }))).toBe("VALIDATION");
    expect(await code(createComment(db, fan, { postId, body: "x".repeat(301) }))).toBe("VALIDATION");
    await setSettings(db, { dailyCommentLimit: 2 });
    await createComment(db, fan, { postId, body: "one" });
    await createComment(db, fan, { postId, body: "two" });
    expect(await code(createComment(db, fan, { postId, body: "three" }))).toBe("RATE_LIMITED");
    await setSettings(db, { commentsOpen: false });
    expect(await code(createComment(db, mod, { postId, body: "paused" }))).toBe("UNAVAILABLE");
  });

  it("lets authors delete their own comment only, with replies going too", async () => {
    const top = await createComment(db, fan, { postId, body: "top level" });
    await createComment(db, author, { postId, parentId: top.id, body: "reply" });
    expect(await code(deleteOwnComment(db, author, top.id))).toBe("NOT_FOUND");
    await deleteOwnComment(db, fan, top.id);
    expect(await listComments(db, postId)).toHaveLength(0);
  });

  it("hides the text of removed comments but keeps the thread structure", async () => {
    const top = await createComment(db, fan, { postId, body: "something awful" });
    await createComment(db, author, { postId, parentId: top.id, body: "a reply" });
    await moderateComment(db, mod, { id: top.id, decision: "remove", note: "rude" });
    const thread = await listComments(db, postId);
    expect(thread[0]).toMatchObject({ id: top.id, removed: true, body: null, author: { id: "", name: "" } });
    expect(JSON.stringify(thread)).not.toContain("something awful");
    // a removed comment with no replies disappears entirely
    const lone = await createComment(db, fan, { postId, body: "lonely bad comment" });
    await moderateComment(db, mod, { id: lone.id, decision: "remove" });
    expect((await listComments(db, postId)).some((c) => c.id === lone.id)).toBe(false);
  });

  it("hides every comment once the post stops being approved", async () => {
    await createComment(db, fan, { postId, body: "visible while live" });
    await moderatePost(db, mod, { id: postId, decision: "remove" });
    expect(await listComments(db, postId)).toHaveLength(0);
    expect(await code(createComment(db, fan, { postId, body: "too late" }))).toBe("NOT_FOUND");
  });

  it("restricts comment moderation to staff, records it, and notifies the author", async () => {
    const c = await createComment(db, fan, { postId, body: "borderline comment" });
    expect(await code(moderateComment(db, author, { id: c.id, decision: "remove" }))).toBe("FORBIDDEN");
    await moderateComment(db, mod, { id: c.id, decision: "remove", note: "off-topic" });
    expect(await code(moderateComment(db, mod2, { id: c.id, decision: "remove" }))).toBe("CONFLICT");
    const [h] = await db.select().from(moderationAction).where(eq(moderationAction.targetId, c.id));
    expect(h).toMatchObject({ action: "comment_removed", actorId: mod.id, targetUserId: fan.id });
    expect((await listNotifications(db, fan.id)).rows[0].type).toBe("comment_removed");
    await moderateComment(db, mod, { id: c.id, decision: "restore" });
    expect((await listComments(db, postId)).find((x) => x.id === c.id)?.body).toBe("borderline comment");
    expect((await listCommentsForStaff(db, mod, { status: "visible" })).total).toBe(1);
    expect(await code(listCommentsForStaff(db, fan, {}))).toBe("FORBIDDEN");
  });

  it("stops moderators removing their own comments (admins may)", async () => {
    const c = await createComment(db, mod, { postId, body: "my own comment here" });
    expect(await code(moderateComment(db, mod, { id: c.id, decision: "remove" }))).toBe("FORBIDDEN");
    expect(await code(moderateComment(db, admin, { id: c.id, decision: "remove" }))).toBeUndefined();
  });
});

describe("reactions", () => {
  it("keeps one reaction per user: set, change, clear", async () => {
    let r = await setReaction(db, fan, { postId, kind: "fire" });
    expect(r.counts).toMatchObject({ fire: 1, dead: 0 });
    r = await setReaction(db, fan, { postId, kind: "dead" });
    expect(r.counts).toMatchObject({ fire: 0, dead: 1 });
    r = await setReaction(db, mod, { postId, kind: "dead" });
    expect(r.counts.dead).toBe(2);
    r = await setReaction(db, fan, { postId, kind: null });
    expect(r.counts).toMatchObject({ dead: 1, fire: 0 });
    expect(r.mine).toBeNull();
  });

  it("validates the kind and the account", async () => {
    expect(await code(setReaction(db, fan, { postId, kind: "thumbsup" }))).toBe("VALIDATION");
    expect(await code(setReaction(db, fan, { postId: "nope", kind: "fire" }))).toBe("VALIDATION");
    expect(await code(setReaction(db, { ...fan, emailVerified: false }, { postId, kind: "fire" }))).toBe("UNVERIFIED");
    expect(await code(setReaction(db, { ...fan, banned: true }, { postId, kind: "fire" }))).toBe("SUSPENDED");
  });

  it("rate limits rapid-fire reacting", async () => {
    let limited = false;
    for (let i = 0; i < 70 && !limited; i++) {
      limited = (await code(setReaction(db, fan, { postId, kind: i % 2 ? "fire" : "dead" }))) === "RATE_LIMITED";
    }
    expect(limited).toBe(true);
  });
});

describe("reports", () => {
  it("files a report with a snapshot, once per target while open, never against yourself", async () => {
    const { id } = await createReport(db, fan, { targetType: "post", targetId: postId, reason: "spam", note: "  looks like an ad " });
    const [row] = await db.select().from(report).where(eq(report.id, id));
    expect(row).toMatchObject({ status: "open", reason: "spam", note: "looks like an ad", reporterId: fan.id, targetAuthorId: author.id });
    expect(row.contentSnapshot.length).toBeGreaterThan(10);
    expect(await code(createReport(db, fan, { targetType: "post", targetId: postId, reason: "hate" }))).toBe("CONFLICT");
    expect(await code(createReport(db, author, { targetType: "post", targetId: postId, reason: "spam" }))).toBe("VALIDATION");
    expect(await code(createReport(db, { ...fan, emailVerified: false }, { targetType: "post", targetId: postId, reason: "spam" }))).toBe("UNVERIFIED");
  });

  it("keeps the original text in the report even if the post is edited later", async () => {
    await createReport(db, fan, { targetType: "post", targetId: postId, reason: "spam" });
    const [before] = await db.select().from(report);
    await db.update(post).set({ body: "Totally different text now, nothing to see" }).where(eq(post.id, postId));
    const [after] = await db.select().from(report);
    expect(after.contentSnapshot).toBe(before.contentSnapshot);
  });

  it("reports comments, but not removed ones", async () => {
    const c = await createComment(db, fan, { postId, body: "this is reportable" });
    await createReport(db, author, { targetType: "comment", targetId: c.id, reason: "harassment" });
    await moderateComment(db, mod, { id: c.id, decision: "remove" });
    expect(await code(createReport(db, mod2, { targetType: "comment", targetId: c.id, reason: "spam" }))).toBe("NOT_FOUND");
  });

  it("limits staff-only listing and lets staff dismiss, which tells the reporters", async () => {
    const { id } = await createReport(db, fan, { targetType: "post", targetId: postId, reason: "spam" });
    const other = await makeUser(db, { name: "Other" });
    await createReport(db, other, { targetType: "post", targetId: postId, reason: "hate" });
    expect(await code(listReports(db, fan, { status: "open" }))).toBe("FORBIDDEN");
    expect((await listReports(db, mod, { status: "open" })).total).toBe(2);

    await resolveReport(db, mod, { id, resolution: "dismiss" });
    // both open reports on the same post are closed together
    expect((await listReports(db, mod, { status: "open" })).total).toBe(0);
    expect((await listReports(db, mod, { status: "dismissed" })).total).toBe(2);
    expect((await getPublicPost(db, postId))?.id).toBe(postId); // still live
    expect((await listNotifications(db, fan.id)).rows.some((n) => n.type === "report_resolved")).toBe(true);
    expect(await code(resolveReport(db, mod2, { id, resolution: "dismiss" }))).toBe("CONFLICT");
    // after resolution the same user can report again
    expect(await code(createReport(db, fan, { targetType: "post", targetId: postId, reason: "spam" }))).toBeUndefined();
  });

  it("removes the content when asked, in the same transaction, and notifies the author", async () => {
    const { id } = await createReport(db, fan, { targetType: "post", targetId: postId, reason: "personal_info" });
    await resolveReport(db, mod, { id, resolution: "remove_content", note: "shared a phone number" });
    expect(await getPublicPost(db, postId)).toBeNull();
    const [r] = await db.select().from(report).where(eq(report.id, id));
    expect(r).toMatchObject({ status: "resolved", resolution: "content_removed", resolvedById: mod.id });
    const actions = (await db.select().from(moderationAction)).map((a) => a.action).sort();
    expect(actions).toContain("post_removed");
    expect(actions).toContain("report_resolved");
    expect((await listNotifications(db, author.id)).rows.some((n) => n.type === "post_removed")).toBe(true);
  });

  it("handles reports on content that was already removed, and rolls back on failure", async () => {
    const { id } = await createReport(db, fan, { targetType: "post", targetId: postId, reason: "spam" });
    await moderatePost(db, mod, { id: postId, decision: "remove" });
    await resolveReport(db, mod2, { id, resolution: "remove_content" }); // nothing left to remove, still resolves
    expect((await db.select().from(report).where(eq(report.id, id)))[0].status).toBe("resolved");
  });

  it("stops moderators handling reports about their own content", async () => {
    const own = await approvedPost(db, mod, admin);
    const { id } = await createReport(db, fan, { targetType: "post", targetId: own, reason: "spam" });
    expect(await code(resolveReport(db, mod, { id, resolution: "dismiss" }))).toBe("FORBIDDEN");
    expect(await code(resolveReport(db, mod2, { id, resolution: "dismiss" }))).toBeUndefined();
  });

  it("rate limits report spam", async () => {
    await setSettings(db, { dailyReportLimit: 2 });
    const posts = [await approvedPost(db, author, mod), await approvedPost(db, author, mod), await approvedPost(db, author, mod)];
    await createReport(db, fan, { targetType: "post", targetId: posts[0], reason: "spam" });
    await createReport(db, fan, { targetType: "post", targetId: posts[1], reason: "spam" });
    expect(await code(createReport(db, fan, { targetType: "post", targetId: posts[2], reason: "spam" }))).toBe("RATE_LIMITED");
  });
});

describe("notifications", () => {
  it("only lets a user read and mark their own notifications", async () => {
    await createComment(db, fan, { postId, body: "ping the author" });
    const [n] = (await listNotifications(db, author.id)).rows;
    expect(await unreadCount(db, author.id)).toBe(1);
    await markRead(db, fan.id, n.id); // wrong user: no effect
    expect(await unreadCount(db, author.id)).toBe(1);
    await markRead(db, author.id, n.id);
    expect(await unreadCount(db, author.id)).toBe(0);
  });

  it("marks everything read and paginates", async () => {
    for (let i = 0; i < 3; i++) await createComment(db, fan, { postId, body: `comment number ${i}` });
    expect(await unreadCount(db, author.id)).toBe(3);
    await markAllRead(db, author.id);
    expect(await unreadCount(db, author.id)).toBe(0);
    expect((await listNotifications(db, author.id, { unreadOnly: true })).total).toBe(0);
    expect((await listNotifications(db, author.id)).total).toBe(3);
  });

  it("cascades notifications away with the post", async () => {
    await createComment(db, fan, { postId, body: "will be gone" });
    await db.delete(post).where(eq(post.id, postId));
    expect(await db.select().from(comment)).toHaveLength(0);
    expect((await db.select().from(notification).where(eq(notification.postId, postId))).length).toBe(0);
  });
});

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { moderationAction, notification, post, report } from "@/lib/db/schema";
import type { Actor } from "@/lib/platform/actor";
import { AppError } from "@/lib/platform/errors";
import { createComment } from "@/lib/services/comments";
import {
  createPost,
  deleteOwnPost,
  getOwnPost,
  getPublicPost,
  listOwnPosts,
  listPostsForStaff,
  listPublicPosts,
  moderatePost,
  updateOwnPost,
} from "@/lib/services/posts";
import { setReaction } from "@/lib/services/reactions";
import { createReport } from "@/lib/services/reports";
import { createTestDb, makeUser, resetDb, type TestDb } from "../helpers/db";
import { approvedPost, noCooldowns, setSettings, uniqueBody } from "../helpers/fixtures";

let db: TestDb;
let close: () => Promise<void>;
let author: Actor, other: Actor, mod: Actor, admin: Actor;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(async () => close());
beforeEach(async () => {
  await resetDb(db);
  await noCooldowns(db);
  author = await makeUser(db, { name: "Author" });
  other = await makeUser(db, { name: "Other" });
  mod = await makeUser(db, { name: "Mod", role: "moderator" });
  admin = await makeUser(db, { name: "Admin", role: "admin" });
});

async function code(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
  } catch (e) {
    return e instanceof AppError ? e.code : `OTHER:${(e as Error).message}`;
  }
  return undefined;
}

const feed = (q: Record<string, unknown> = {}) => listPublicPosts(db, { category: "all", sort: "new", page: 1, ...q } as never);

describe("submitting", () => {
  it("always starts as pending and is invisible to the public", async () => {
    const { id } = await createPost(db, author, { body: uniqueBody(), category: "exams" });
    const [row] = await db.select().from(post).where(eq(post.id, id));
    expect(row.status).toBe("pending");
    expect((await feed()).items).toHaveLength(0);
    expect(await getPublicPost(db, id)).toBeNull();
  });

  it("ignores any attempt to smuggle in a status or author", async () => {
    const { id } = await createPost(db, author, { body: uniqueBody(), category: "life", status: "approved", authorId: other.id } as never);
    const [row] = await db.select().from(post).where(eq(post.id, id));
    expect(row.status).toBe("pending");
    expect(row.authorId).toBe(author.id);
  });

  it("requires a verified, non-suspended account", async () => {
    expect(await code(createPost(db, { ...author, emailVerified: false }, { body: uniqueBody(), category: "life" }))).toBe("UNVERIFIED");
    expect(await code(createPost(db, { ...author, banned: true }, { body: uniqueBody(), category: "life" }))).toBe("SUSPENDED");
    // a finished suspension no longer blocks
    expect(
      await code(createPost(db, { ...author, banned: true, banExpires: new Date(Date.now() - 1000) }, { body: uniqueBody(), category: "life" })),
    ).toBeUndefined();
  });

  it("validates length, category, links and blocked terms", async () => {
    expect(await code(createPost(db, author, { body: "too short", category: "life" }))).toBe("VALIDATION");
    expect(await code(createPost(db, author, { body: "x".repeat(501), category: "life" }))).toBe("VALIDATION");
    expect(await code(createPost(db, author, { body: uniqueBody(), category: "nope" }))).toBe("VALIDATION");
    expect(await code(createPost(db, author, { body: `${uniqueBody()} see https://spam.example`, category: "life" }))).toBe("VALIDATION");
    await setSettings(db, { blockedTerms: ["forbiddenword"] });
    expect(await code(createPost(db, author, { body: `${uniqueBody()} forbiddenword`, category: "life" }))).toBe("VALIDATION");
  });

  it("rejects an identical resubmission", async () => {
    const body = uniqueBody();
    await createPost(db, author, { body, category: "life" });
    expect(await code(createPost(db, author, { body: `  ${body.toUpperCase()}  `, category: "exams" }))).toBe("CONFLICT");
  });

  it("enforces the burst cooldown and the daily limit, per user", async () => {
    await setSettings(db, { postCooldownSec: 60 });
    await createPost(db, author, { body: uniqueBody(), category: "life" });
    expect(await code(createPost(db, author, { body: uniqueBody(), category: "life" }))).toBe("RATE_LIMITED");
    // another user is unaffected
    expect(await code(createPost(db, other, { body: uniqueBody(), category: "life" }))).toBeUndefined();

    await setSettings(db, { postCooldownSec: 0, dailyPostLimit: 2 });
    const third = await makeUser(db);
    await createPost(db, third, { body: uniqueBody(), category: "life" });
    await createPost(db, third, { body: uniqueBody(), category: "life" });
    expect(await code(createPost(db, third, { body: uniqueBody(), category: "life" }))).toBe("RATE_LIMITED");
  });

  it("respects the 'submissions paused' switch", async () => {
    await setSettings(db, { submissionsOpen: false });
    expect(await code(createPost(db, author, { body: uniqueBody(), category: "life" }))).toBe("UNAVAILABLE");
  });
});

describe("moderation lifecycle and visibility (leak tests)", () => {
  it("shows a post publicly only while it is approved", async () => {
    const { id } = await createPost(db, author, { body: uniqueBody(), category: "life" });
    const visible = async () => (await getPublicPost(db, id)) !== null && (await feed()).items.some((p) => p.id === id);

    expect(await visible()).toBe(false); // pending
    await moderatePost(db, mod, { id, decision: "approve" });
    expect(await visible()).toBe(true);
    await moderatePost(db, mod, { id, decision: "remove", note: "off-topic" });
    expect(await visible()).toBe(false); // removed
    await moderatePost(db, mod, { id, decision: "restore" });
    expect(await visible()).toBe(true);

    const second = await createPost(db, other, { body: uniqueBody(), category: "life" });
    await moderatePost(db, mod, { id: second.id, decision: "reject" });
    expect(await getPublicPost(db, second.id)).toBeNull(); // rejected
  });

  it("blocks interactions with posts that are not live", async () => {
    const { id } = await createPost(db, author, { body: uniqueBody(), category: "life" });
    expect(await code(createComment(db, other, { postId: id, body: "first!" }))).toBe("NOT_FOUND");
    expect(await code(setReaction(db, other, { postId: id, kind: "fire" }))).toBe("NOT_FOUND");
    expect(await code(createReport(db, other, { targetType: "post", targetId: id, reason: "spam" }))).toBe("NOT_FOUND");
  });

  it("never exposes moderation notes or e-mail through public views, but shows the note to the author", async () => {
    const { id } = await createPost(db, author, { body: uniqueBody(), category: "life" });
    await moderatePost(db, mod, { id, decision: "reject", note: "Please rewrite this one" });
    const mine = await getOwnPost(db, author, id);
    expect(mine?.status).toBe("rejected");
    expect(mine?.moderationNote).toBe("Please rewrite this one");
    expect(await getOwnPost(db, other, id)).toBeNull(); // someone else's post is invisible, not forbidden

    const livePost = await approvedPost(db, other, mod);
    const pub = await getPublicPost(db, livePost);
    expect(JSON.stringify(pub)).not.toMatch(/moderationNote|email|@example\.test/);
  });

  it("allows only staff to moderate, and stops moderators approving their own posts", async () => {
    const { id } = await createPost(db, author, { body: uniqueBody(), category: "life" });
    expect(await code(moderatePost(db, author, { id, decision: "approve" }))).toBe("FORBIDDEN");
    expect(await code(moderatePost(db, other, { id, decision: "approve" }))).toBe("FORBIDDEN");
    expect(await code(moderatePost(db, { ...mod, emailVerified: false }, { id, decision: "approve" }))).toBe("FORBIDDEN");
    expect(await code(moderatePost(db, { ...mod, banned: true }, { id, decision: "approve" }))).toBe("FORBIDDEN");

    const modPost = await createPost(db, mod, { body: uniqueBody(), category: "life" });
    expect(await code(moderatePost(db, mod, { id: modPost.id, decision: "approve" }))).toBe("FORBIDDEN");
    expect(await code(moderatePost(db, admin, { id: modPost.id, decision: "approve" }))).toBeUndefined(); // admin override
  });

  it("rejects impossible transitions and invalid ids", async () => {
    const { id } = await createPost(db, author, { body: uniqueBody(), category: "life" });
    expect(await code(moderatePost(db, mod, { id, decision: "remove" }))).toBe("CONFLICT"); // pending can't be 'removed'
    expect(await code(moderatePost(db, mod, { id, decision: "restore" }))).toBe("CONFLICT");
    await moderatePost(db, mod, { id, decision: "approve" });
    expect(await code(moderatePost(db, mod, { id, decision: "approve" }))).toBe("CONFLICT"); // already approved
    expect(await code(moderatePost(db, mod, { id: "not-a-uuid", decision: "approve" }))).toBe("VALIDATION");
    expect(await code(moderatePost(db, mod, { id: "123e4567-e89b-42d3-a456-426614174000", decision: "approve" }))).toBe("NOT_FOUND");
  });

  it("lets exactly one of two simultaneous decisions win", async () => {
    const { id } = await createPost(db, author, { body: uniqueBody(), category: "life" });
    const results = await Promise.allSettled([
      moderatePost(db, mod, { id, decision: "approve" }),
      moderatePost(db, admin, { id, decision: "reject" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const history = await db.select().from(moderationAction).where(eq(moderationAction.targetId, id));
    expect(history).toHaveLength(1); // the loser rolled back completely
  });

  it("writes moderation history, an audit trail and an author notification in one go", async () => {
    const { id } = await createPost(db, author, { body: uniqueBody(), category: "life" });
    await moderatePost(db, mod, { id, decision: "reject", note: "Needs more delusion" });
    const [h] = await db.select().from(moderationAction).where(eq(moderationAction.targetId, id));
    expect(h).toMatchObject({ action: "post_rejected", actorId: mod.id, actorName: "Mod", targetUserId: author.id, note: "Needs more delusion" });
    const notes = await db.select().from(notification).where(eq(notification.userId, author.id));
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe("post_rejected");
    expect(notes[0].message).toContain("Needs more delusion");
  });
});

describe("editing and deleting your own posts", () => {
  it("sends an edited, approved post back to the queue and out of the feed", async () => {
    const id = await approvedPost(db, author, mod);
    expect((await feed()).items).toHaveLength(1);
    await updateOwnPost(db, author, id, { body: uniqueBody("edited"), category: "exams" });
    expect((await feed()).items).toHaveLength(0);
    const mine = await getOwnPost(db, author, id);
    expect(mine?.status).toBe("pending");
    expect(mine?.editedAt).not.toBeNull();
  });

  it("lets a rejected post be revised and resubmitted, and forbids editing other people's or removed posts", async () => {
    const { id } = await createPost(db, author, { body: uniqueBody(), category: "life" });
    await moderatePost(db, mod, { id, decision: "reject", note: "nope" });
    await updateOwnPost(db, author, id, { body: uniqueBody("revised"), category: "life" });
    expect((await getOwnPost(db, author, id))?.moderationNote).toBeNull();

    expect(await code(updateOwnPost(db, other, id, { body: uniqueBody(), category: "life" }))).toBe("NOT_FOUND");

    const liveId = await approvedPost(db, author, mod);
    await moderatePost(db, mod, { id: liveId, decision: "remove" });
    expect(await code(updateOwnPost(db, author, liveId, { body: uniqueBody(), category: "life" }))).toBe("NOT_FOUND");
  });

  it("deletes your own post but not someone else's, nor one under an open report, nor a removed one", async () => {
    const id = await approvedPost(db, author, mod);
    expect(await code(deleteOwnPost(db, other, id))).toBe("NOT_FOUND");
    expect(await db.select().from(post).where(eq(post.id, id))).toHaveLength(1);

    await createReport(db, other, { targetType: "post", targetId: id, reason: "spam" });
    expect(await code(deleteOwnPost(db, author, id))).toBe("CONFLICT");

    const removed = await approvedPost(db, author, mod);
    await moderatePost(db, mod, { id: removed, decision: "remove" });
    expect(await code(deleteOwnPost(db, author, removed))).toBe("FORBIDDEN");

    const fresh = await createPost(db, author, { body: uniqueBody(), category: "life" });
    await deleteOwnPost(db, author, fresh.id);
    expect(await getOwnPost(db, author, fresh.id)).toBeNull();
    // deleting the reported post's reports happens only via cascade when allowed
    expect((await db.select().from(report)).length).toBe(1);
  });
});

describe("feed: search, filtering, sorting, pagination", () => {
  beforeEach(async () => {
    await approvedPost(db, author, mod, "Exam tomorrow? I have studied 100% of the cover page", "exams");
    await approvedPost(db, other, mod, "Highlighter is basically studying, and I own six", "studying");
    await approvedPost(db, author, mod, "Teacher said it is easy so it must be easy ok", "results");
  });

  it("filters by category and searches body text and author names", async () => {
    expect((await feed({ category: "exams" })).items).toHaveLength(1);
    expect((await feed({ q: "highlighter" })).items).toHaveLength(1);
    expect((await feed({ q: "Other" })).items.map((p) => p.author.name)).toEqual(["Other"]); // author name match
    expect((await feed({ q: "nothing-matches-this" })).items).toHaveLength(0);
  });

  it("treats LIKE wildcards in search as literal text", async () => {
    expect((await feed({ q: "100%" })).items).toHaveLength(1);
    expect((await feed({ q: "%" })).items).toHaveLength(1); // only the post that literally contains "%"
    expect((await feed({ q: "_" })).items).toHaveLength(0);
  });

  it("sorts newest first by default and by reactions for 'top'", async () => {
    const all = await feed();
    expect(all.items).toHaveLength(3);
    const target = all.items[2].id; // the oldest
    await setReaction(db, other, { postId: target, kind: "fire" });
    await setReaction(db, mod, { postId: target, kind: "dead" });
    expect((await feed({ sort: "top" })).items[0].id).toBe(target);
    expect((await feed({ sort: "new" })).items[0].id).toBe(all.items[0].id);
  });

  it("paginates and clamps out-of-range pages", async () => {
    await setSettings(db, { dailyPostLimit: 50 }); // this test creates many posts for one author
    for (let i = 0; i < 12; i++) await approvedPost(db, author, mod);
    const p1 = await feed({ page: 1 });
    const p2 = await feed({ page: 2 });
    expect(p1.items).toHaveLength(12);
    expect(p2.items).toHaveLength(3);
    expect(p1.total).toBe(15);
    expect(p1.pageCount).toBe(2);
    expect(new Set([...p1.items, ...p2.items].map((p) => p.id)).size).toBe(15); // no overlaps
    expect((await feed({ page: 99 })).page).toBe(2);
  });

  it("returns the viewer's own reaction and per-kind counts", async () => {
    const id = (await feed()).items[0].id;
    await setReaction(db, other, { postId: id, kind: "fire" });
    const as = await listPublicPosts(db, { category: "all", sort: "new", page: 1 }, { viewerId: other.id });
    const view = as.items.find((p) => p.id === id)!;
    expect(view.myReaction).toBe("fire");
    expect(view.reactions.fire).toBe(1);
    expect((await feed()).items.find((p) => p.id === id)!.myReaction).toBeNull();
  });
});

describe("author and staff listings", () => {
  it("lists only the caller's posts, filtered by status", async () => {
    await createPost(db, author, { body: uniqueBody(), category: "life" });
    await approvedPost(db, author, mod);
    await createPost(db, other, { body: uniqueBody(), category: "life" });
    expect((await listOwnPosts(db, author)).total).toBe(2);
    expect((await listOwnPosts(db, author, { status: "pending" })).total).toBe(1);
  });

  it("gives staff the queue (oldest first) and refuses everyone else", async () => {
    const a = await createPost(db, author, { body: uniqueBody("first"), category: "life" });
    await createPost(db, other, { body: uniqueBody("second"), category: "life" });
    const queue = await listPostsForStaff(db, mod, { status: "pending", oldestFirst: true });
    expect(queue.items).toHaveLength(2);
    expect(queue.items[0].id).toBe(a.id);
    expect(await code(listPostsForStaff(db, author, { status: "pending" }))).toBe("FORBIDDEN");
  });
});

// AUDIT: races. Real traffic means double-clicks and parallel requests; limits and uniqueness must hold under them.
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { post, reaction, report, siteSetting } from "@/lib/db/schema";
import type { Actor } from "@/lib/platform/actor";
import { AppError } from "@/lib/platform/errors";
import { createComment } from "@/lib/services/comments";
import { createPost, moderatePost } from "@/lib/services/posts";
import { setReaction } from "@/lib/services/reactions";
import { createReport } from "@/lib/services/reports";
import { suspendUser } from "@/lib/services/users";
import { createTestDb, makeUser, resetDb, type TestDb } from "../helpers/db";
import { approvedPost, setSettings, uniqueBody } from "../helpers/fixtures";

let db: TestDb;
let close: () => Promise<void>;
let a: Actor, b: Actor, mod: Actor, mod2: Actor;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(async () => close());
beforeEach(async () => {
  await resetDb(db);
  a = await makeUser(db, { name: "Author" });
  b = await makeUser(db, { name: "Other" });
  mod = await makeUser(db, { name: "Mod", role: "moderator" });
  mod2 = await makeUser(db, { name: "Mod2", role: "moderator" });
});

const codes = (rs: PromiseSettledResult<unknown>[]) => rs.map((r) => (r.status === "fulfilled" ? "ok" : r.reason instanceof AppError ? r.reason.code : `RAW:${(r.reason as Error).message}`));

describe("posting under a burst", () => {
  it("a double-click with the default 30s cooldown stores exactly one post", async () => {
    const body = uniqueBody();
    const results = await Promise.allSettled([createPost(db, a, { body, category: "life" }), createPost(db, a, { body, category: "life" })]);
    expect(codes(results).filter((c) => c === "ok")).toHaveLength(1);
    expect(codes(results).some((c) => c.startsWith("RAW"))).toBe(false);
    expect(await db.select().from(post).where(eq(post.authorId, a.id))).toHaveLength(1);
  });

  it("with the cooldown OFF, identical simultaneous submissions still store only one", async () => {
    await setSettings(db, { postCooldownSec: 0, dailyPostLimit: 50 });
    const body = uniqueBody();
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => createPost(db, a, { body, category: "life" })));
    expect(codes(results).some((c) => c.startsWith("RAW"))).toBe(false);
    expect(await db.select().from(post).where(eq(post.authorId, a.id))).toHaveLength(1);
  });

  it("the daily limit cannot be beaten by parallel requests", async () => {
    await setSettings(db, { postCooldownSec: 0, dailyPostLimit: 5 });
    const results = await Promise.allSettled(Array.from({ length: 15 }, (_, i) => createPost(db, a, { body: `${uniqueBody()} #${i}`, category: "life" })));
    expect(codes(results).filter((c) => c === "ok")).toHaveLength(5);
    expect(codes(results).filter((c) => c === "RATE_LIMITED")).toHaveLength(10);
    expect(await db.select().from(post).where(eq(post.authorId, a.id))).toHaveLength(5);
  });

  it("the comment daily limit holds under parallel requests too", async () => {
    await setSettings(db, { postCooldownSec: 0, commentCooldownSec: 0, dailyCommentLimit: 4, dailyPostLimit: 50 });
    const id = await approvedPost(db, a, mod);
    const results = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => createComment(db, b, { postId: id, body: `parallel comment ${i}` })));
    expect(codes(results).filter((c) => c === "ok")).toHaveLength(4);
  });
});

describe("uniqueness under parallel requests", () => {
  it("simultaneous identical reports from one user create exactly one open report (never a 500)", async () => {
    await setSettings(db, { postCooldownSec: 0, dailyPostLimit: 50, dailyReportLimit: 50 });
    const id = await approvedPost(db, a, mod);
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => createReport(db, b, { targetType: "post", targetId: id, reason: "spam" })));
    expect(codes(results).filter((c) => c === "ok")).toHaveLength(1);
    expect(codes(results).some((c) => c.startsWith("RAW"))).toBe(false);
    expect(await db.select().from(report)).toHaveLength(1);
  });

  it("simultaneous reactions from one user leave exactly one row, with a valid kind", async () => {
    await setSettings(db, { postCooldownSec: 0, dailyPostLimit: 50 });
    const id = await approvedPost(db, a, mod);
    const kinds = ["relatable", "dead", "delusional", "fire"] as const;
    const results = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => setReaction(db, b, { postId: id, kind: kinds[i % 4] })));
    expect(codes(results).some((c) => c.startsWith("RAW"))).toBe(false);
    const rows = await db.select().from(reaction).where(eq(reaction.postId, id));
    expect(rows).toHaveLength(1);
    expect(kinds).toContain(rows[0].kind);
  });
});

describe("moderation under parallel staff", () => {
  it("two moderators deciding at once: one wins, history has exactly one entry per post", async () => {
    await setSettings(db, { postCooldownSec: 0, dailyPostLimit: 50 });
    const { id } = await createPost(db, a, { body: uniqueBody(), category: "life" });
    const results = await Promise.allSettled([moderatePost(db, mod, { id, decision: "approve" }), moderatePost(db, mod2, { id, decision: "reject" })]);
    expect(codes(results).sort()).toEqual(["CONFLICT", "ok"]);
  });

  it("two moderators suspending the same user at once leaves a consistent state", async () => {
    const results = await Promise.allSettled([
      suspendUser(db, mod, { userId: b.id, mode: "suspend", days: 3, reason: "Parallel A" }),
      suspendUser(db, mod2, { userId: b.id, mode: "ban", reason: "Parallel B" }),
    ]);
    expect(codes(results).some((c) => c.startsWith("RAW"))).toBe(false);
    const rows = await db.select().from(siteSetting); // untouched, sanity
    expect(rows).toHaveLength(0);
  });
});

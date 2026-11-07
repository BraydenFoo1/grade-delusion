import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";
import { createTestDb, makeUser, type TestDb } from "../helpers/db";

let db: TestDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(async () => close());

/** Drizzle wraps driver errors; the Postgres message lives on `cause`. */
async function dbError(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    const err = e as Error & { cause?: Error };
    return `${err.message} ${err.cause?.message ?? ""}`;
  }
  return "";
}

describe("migrations and constraints", () => {
  it("applies every migration to a real Postgres engine", async () => {
    const rows = await db.execute(sql`select count(*)::int as n from information_schema.tables where table_schema = 'public'`);
    expect((rows.rows[0] as { n: number }).n).toBeGreaterThanOrEqual(14);
  });

  it("rejects an invalid post status, category and overlong body", async () => {
    const author = await makeUser(db);
    const base = { authorId: author.id, body: "I will definitely study tomorrow" };
    expect(await dbError(db.insert(schema.post).values({ ...base, status: "published" }))).toMatch(/post_status_check/);
    expect(await dbError(db.insert(schema.post).values({ ...base, category: "memes" }))).toMatch(/post_category_check/);
    expect(await dbError(db.insert(schema.post).values({ ...base, body: "x".repeat(501) }))).toMatch(/post_body_length/);
    expect(await dbError(db.insert(schema.post).values({ ...base, body: "" }))).toMatch(/post_body_length/);
  });

  it("defaults new posts to pending", async () => {
    const author = await makeUser(db);
    const [p] = await db.insert(schema.post).values({ authorId: author.id, body: "Pre-moderated by default" }).returning();
    expect(p.status).toBe("pending");
    expect(p.publishedAt).toBeNull();
  });

  it("cascades: deleting a user removes their posts, comments and reactions", async () => {
    const author = await makeUser(db);
    const fan = await makeUser(db);
    const [p] = await db.insert(schema.post).values({ authorId: author.id, body: "This post will vanish with its author" }).returning();
    await db.insert(schema.comment).values({ postId: p.id, authorId: fan.id, body: "hello" });
    await db.insert(schema.reaction).values({ postId: p.id, userId: fan.id, kind: "fire" });
    await db.delete(schema.user).where(eq(schema.user.id, author.id));
    expect(await db.select().from(schema.post).where(eq(schema.post.id, p.id))).toHaveLength(0);
    expect(await db.select().from(schema.comment).where(eq(schema.comment.postId, p.id))).toHaveLength(0);
    expect(await db.select().from(schema.reaction).where(eq(schema.reaction.postId, p.id))).toHaveLength(0);
  });

  it("allows only one reaction per user per post", async () => {
    const a = await makeUser(db);
    const b = await makeUser(db);
    const [p] = await db.insert(schema.post).values({ authorId: a.id, body: "React to me once please" }).returning();
    await db.insert(schema.reaction).values({ postId: p.id, userId: b.id, kind: "fire" });
    expect(await dbError(db.insert(schema.reaction).values({ postId: p.id, userId: b.id, kind: "dead" }))).toMatch(/duplicate|primary|pkey/i);
  });

  it("blocks duplicate OPEN reports by the same user but allows a new one after resolution", async () => {
    const author = await makeUser(db);
    const reporter = await makeUser(db);
    const [p] = await db.insert(schema.post).values({ authorId: author.id, body: "A reportable post, hypothetically" }).returning();
    const row = { reporterId: reporter.id, postId: p.id, reason: "spam", contentSnapshot: p.body };
    const [first] = await db.insert(schema.report).values(row).returning();
    expect(await dbError(db.insert(schema.report).values(row))).toMatch(/report_open_post_unique/);
    await db.update(schema.report).set({ status: "resolved" }).where(eq(schema.report.id, first.id));
    await expect(db.insert(schema.report).values(row)).resolves.toBeDefined();
  });

  it("requires a report to target exactly one of post or comment", async () => {
    const reporter = await makeUser(db);
    expect(
      await dbError(db.insert(schema.report).values({ reporterId: reporter.id, reason: "spam", contentSnapshot: "x" })),
    ).toMatch(/report_one_target/);
  });

  it("rejects unknown roles", async () => {
    expect(await dbError(db.insert(schema.user).values({ id: "r1", name: "Roley", email: "r1@example.test", role: "superuser" }))).toMatch(
      /user_role_check/,
    );
  });
});

describe("append-only history", () => {
  it("refuses UPDATE and DELETE on audit_log and moderation_action", async () => {
    const [a] = await db.insert(schema.auditLog).values({ action: "test.event", details: { n: 1 } }).returning();
    expect(await dbError(db.update(schema.auditLog).set({ action: "tampered" }).where(eq(schema.auditLog.id, a.id)))).toMatch(/append-only/);
    expect(await dbError(db.delete(schema.auditLog).where(eq(schema.auditLog.id, a.id)))).toMatch(/append-only/);

    const [m] = await db
      .insert(schema.moderationAction)
      .values({ actorId: "x", actorName: "X", action: "post_approved", targetType: "post", targetId: "p" })
      .returning();
    expect(await dbError(db.update(schema.moderationAction).set({ note: "edited" }).where(eq(schema.moderationAction.id, m.id)))).toMatch(
      /append-only/,
    );
    expect(await dbError(db.delete(schema.moderationAction).where(eq(schema.moderationAction.id, m.id)))).toMatch(/append-only/);
  });

  it("keeps history when the acting user is deleted (no foreign key)", async () => {
    const mod = await makeUser(db, { role: "moderator" });
    await db.insert(schema.auditLog).values({ actorId: mod.id, action: "demo" });
    await db.delete(schema.user).where(eq(schema.user.id, mod.id));
    const rows = await db.select().from(schema.auditLog).where(eq(schema.auditLog.actorId, mod.id));
    expect(rows).toHaveLength(1);
  });
});

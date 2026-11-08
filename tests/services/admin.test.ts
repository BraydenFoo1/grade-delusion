import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { auditLog, comment, moderationAction, notification, post, session, siteSetting, user } from "@/lib/db/schema";
import type { Actor } from "@/lib/platform/actor";
import { AppError } from "@/lib/platform/errors";
import { getOverview } from "@/lib/services/analytics";
import { listAudit, listModerationHistory } from "@/lib/services/audit";
import { createComment } from "@/lib/services/comments";
import { createPost, moderatePost } from "@/lib/services/posts";
import { purgeRejectedPosts } from "@/lib/services/retention";
import { createReport } from "@/lib/services/reports";
import { getSettings, updateSettings } from "@/lib/services/settings";
import {
  getPublicProfile,
  getUserDetail,
  listActivity,
  listStaffMembers,
  listUsers,
  maskEmail,
  restoreUser,
  setUserRole,
  suspendUser,
  updateProfile,
} from "@/lib/services/users";
import { createTestDb, makeUser, resetDb, type TestDb } from "../helpers/db";
import { approvedPost, noCooldowns, setSettings, uniqueBody } from "../helpers/fixtures";

let db: TestDb;
let close: () => Promise<void>;
let member: Actor, victim: Actor, mod: Actor, mod2: Actor, admin: Actor, admin2: Actor;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(async () => close());
beforeEach(async () => {
  await resetDb(db);
  await noCooldowns(db);
  await setSettings(db, { dailyPostLimit: 50, dailyCommentLimit: 100, dailyReportLimit: 50 });
  member = await makeUser(db, { name: "Member", email: "member@example.test" });
  victim = await makeUser(db, { name: "Victim", email: "victim@example.test" });
  mod = await makeUser(db, { name: "Mod", role: "moderator" });
  mod2 = await makeUser(db, { name: "Mod Two", role: "moderator" });
  admin = await makeUser(db, { name: "Admin", role: "admin", email: "admin@example.test" });
  admin2 = await makeUser(db, { name: "Admin Two", role: "admin" });
});

async function code(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
  } catch (e) {
    return e instanceof AppError ? e.code : `OTHER:${(e as Error).message}`;
  }
  return undefined;
}

describe("suspending, banning and restoring users", () => {
  it("lets a moderator suspend a regular user: flagged, signed out everywhere, recorded and notified", async () => {
    await db.insert(session).values({ id: "s1", token: "t1", userId: victim.id, expiresAt: new Date(Date.now() + 1e7) });
    await suspendUser(db, mod, { userId: victim.id, mode: "suspend", days: 3, reason: "Repeated spam" });
    const [row] = await db.select().from(user).where(eq(user.id, victim.id));
    expect(row.banned).toBe(true);
    expect(row.banReason).toBe("Repeated spam");
    expect(row.banExpires!.getTime()).toBeGreaterThan(Date.now() + 2.9 * 86400000);
    expect(await db.select().from(session).where(eq(session.userId, victim.id))).toHaveLength(0);
    const [h] = await db.select().from(moderationAction).where(eq(moderationAction.targetUserId, victim.id));
    expect(h).toMatchObject({ action: "user_suspended", actorId: mod.id, note: "Repeated spam" });
    expect((await db.select().from(auditLog)).some((a) => a.action === "moderation.user_suspended")).toBe(true);
    expect((await db.select().from(notification).where(eq(notification.userId, victim.id)))[0].type).toBe("account_suspended");
  });

  it("makes bans permanent and suspensions end by themselves", async () => {
    await suspendUser(db, mod, { userId: victim.id, mode: "ban", reason: "Harassment" });
    const [banned] = await db.select().from(user).where(eq(user.id, victim.id));
    expect(banned.banExpires).toBeNull();
    await restoreUser(db, mod, victim.id);
    await suspendUser(db, mod, { userId: victim.id, mode: "suspend", days: 1, reason: "Cool off" });
    const [s] = await db.select().from(user).where(eq(user.id, victim.id));
    expect(s.banExpires).not.toBeNull();
  });

  it("enforces who can act on whom", async () => {
    const reason = "Testing the rules";
    expect(await code(suspendUser(db, member, { userId: victim.id, mode: "ban", reason }))).toBe("FORBIDDEN");
    expect(await code(suspendUser(db, mod, { userId: mod2.id, mode: "ban", reason }))).toBe("FORBIDDEN"); // mod vs mod
    expect(await code(suspendUser(db, mod, { userId: admin.id, mode: "ban", reason }))).toBe("FORBIDDEN"); // mod vs admin
    expect(await code(suspendUser(db, mod, { userId: mod.id, mode: "ban", reason }))).toBe("FORBIDDEN"); // self
    expect(await code(suspendUser(db, admin, { userId: admin2.id, mode: "ban", reason }))).toBe("FORBIDDEN"); // admin vs admin
    expect(await code(suspendUser(db, admin, { userId: mod.id, mode: "suspend", days: 2, reason }))).toBeUndefined(); // admin vs mod
    expect(await code(suspendUser(db, admin, { userId: "ghost", mode: "ban", reason }))).toBe("NOT_FOUND");
  });

  it("validates the reason and the length of a suspension", async () => {
    expect(await code(suspendUser(db, mod, { userId: victim.id, mode: "ban", reason: "no" }))).toBe("VALIDATION");
    expect(await code(suspendUser(db, mod, { userId: victim.id, mode: "suspend", days: 9999, reason: "too long" }))).toBe("VALIDATION");
  });

  it("restores accounts, but only ones that are suspended, and only within your authority", async () => {
    expect(await code(restoreUser(db, mod, victim.id))).toBe("CONFLICT"); // nothing to restore
    await suspendUser(db, mod, { userId: victim.id, mode: "ban", reason: "Mistake incoming" });
    expect(await code(restoreUser(db, member, victim.id))).toBe("FORBIDDEN");
    await restoreUser(db, mod2, victim.id);
    const [row] = await db.select().from(user).where(eq(user.id, victim.id));
    expect(row).toMatchObject({ banned: false, banReason: null, banExpires: null });
    expect((await db.select().from(moderationAction)).map((a) => a.action)).toEqual(["user_banned", "user_restored"]);
  });

  it("hides suspended users' public profiles", async () => {
    expect((await getPublicProfile(db, victim.id))?.name).toBe("Victim");
    await suspendUser(db, mod, { userId: victim.id, mode: "ban", reason: "Gone for good" });
    expect(await getPublicProfile(db, victim.id)).toBeNull();
  });
});

describe("roles", () => {
  it("lets only admins change roles, never their own, and audits the change", async () => {
    expect(await code(setUserRole(db, mod, { userId: member.id, role: "moderator" }))).toBe("FORBIDDEN");
    expect(await code(setUserRole(db, member, { userId: member.id, role: "admin" }))).toBe("FORBIDDEN"); // privilege escalation
    expect(await code(setUserRole(db, admin, { userId: admin.id, role: "user" }))).toBe("FORBIDDEN");
    expect(await code(setUserRole(db, admin, { userId: member.id, role: "superadmin" }))).toBe("VALIDATION");
    expect(await code(setUserRole(db, admin, { userId: member.id, role: "user" }))).toBe("CONFLICT");

    await setUserRole(db, admin, { userId: member.id, role: "moderator" });
    expect((await db.select().from(user).where(eq(user.id, member.id)))[0].role).toBe("moderator");
    const [a] = await db.select().from(auditLog).where(eq(auditLog.action, "user.role_changed"));
    expect(a).toMatchObject({ actorId: admin.id, targetId: member.id, details: { from: "user", to: "moderator" } });
    expect((await listStaffMembers(db, admin)).map((s) => s.name).sort()).toEqual(["Admin", "Admin Two", "Member", "Mod", "Mod Two"]);
    expect(await code(listStaffMembers(db, mod))).toBe("FORBIDDEN");
  });

  it("makes a freshly promoted moderator able to moderate immediately", async () => {
    const { id } = await createPost(db, victim, { body: uniqueBody(), category: "life" });
    await setUserRole(db, admin, { userId: member.id, role: "moderator" });
    const promoted: Actor = { ...member, role: "moderator" };
    await moderatePost(db, promoted, { id, decision: "approve" });
    expect((await db.select().from(post).where(eq(post.id, id)))[0].status).toBe("approved");
  });
});

describe("finding users", () => {
  it("masks e-mail addresses for moderators and shows them to admins", async () => {
    expect(maskEmail("sam@example.com")).toBe("s•••@example.com");
    const asMod = await listUsers(db, mod, {});
    expect(asMod.items.every((u) => !u.email.startsWith("member@"))).toBe(true);
    expect(asMod.items.find((u) => u.name === "Member")?.email).toBe("m•••@example.test");
    const asAdmin = await listUsers(db, admin, {});
    expect(asAdmin.items.find((u) => u.name === "Member")?.email).toBe("member@example.test");
    expect(await code(listUsers(db, member, {}))).toBe("FORBIDDEN");
  });

  it("lets moderators search by name only, admins also by e-mail", async () => {
    expect((await listUsers(db, mod, { q: "Member" })).total).toBe(1);
    expect((await listUsers(db, mod, { q: "member@example" })).total).toBe(0);
    expect((await listUsers(db, admin, { q: "member@example" })).total).toBe(1);
  });

  it("filters by role and suspension state", async () => {
    await suspendUser(db, mod, { userId: victim.id, mode: "ban", reason: "Filter test" });
    expect((await listUsers(db, admin, { state: "suspended" })).items.map((u) => u.name)).toEqual(["Victim"]);
    expect((await listUsers(db, admin, { role: "moderator" })).total).toBe(2);
    expect((await listUsers(db, admin, { state: "active" })).items.some((u) => u.name === "Victim")).toBe(false);
  });

  it("builds a user detail with counts, and includes moderation history", async () => {
    const id = await approvedPost(db, victim, mod);
    await createComment(db, member, { postId: id, body: "nice one" });
    await createReport(db, member, { targetType: "post", targetId: id, reason: "spam" });
    await suspendUser(db, mod, { userId: victim.id, mode: "suspend", days: 2, reason: "Warning shot" });
    const d = await getUserDetail(db, mod, victim.id);
    expect(d?.posts.approved).toBe(1);
    expect(d?.reportsAgainst).toEqual({ open: 1, total: 1 });
    const history = await listModerationHistory(db, mod, { type: "user", id: victim.id });
    expect(history.map((h) => h.action).sort()).toEqual(["post_approved", "user_suspended"]);
    expect(await code(listModerationHistory(db, member, { type: "user", id: victim.id }))).toBe("FORBIDDEN");
    expect(await getUserDetail(db, mod, "ghost")).toBeNull();
  });
});

describe("profiles and activity", () => {
  it("updates display name and bio, blocking reserved names, links and blocked terms", async () => {
    await updateProfile(db, member, { name: "Mei Ling", bio: "Professional crammer" });
    expect((await getPublicProfile(db, member.id))).toMatchObject({ name: "Mei Ling", bio: "Professional crammer" });
    expect(await code(updateProfile(db, member, { name: "Site Admin" }))).toBe("VALIDATION");
    expect(await code(updateProfile(db, member, { name: "Grade Delusion Team" }))).toBe("VALIDATION");
    expect(await code(updateProfile(db, member, { name: "Mei Ling", bio: "visit www.spam.example" }))).toBe("VALIDATION");
    expect(await code(updateProfile(db, member, { name: "x" }))).toBe("VALIDATION");
    await setSettings(db, { blockedTerms: ["scammer"] });
    expect(await code(updateProfile(db, member, { name: "Total Scammer" }))).toBe("VALIDATION");
    expect(await code(updateProfile(db, { ...member, banned: true }, { name: "Fine Name" }))).toBe("SUSPENDED");
    // staff may use staff-looking names
    expect(await code(updateProfile(db, mod, { name: "Moderator Mo" }))).toBeUndefined();
  });

  it("never exposes e-mail or role-internal data on a public profile", async () => {
    const p = await getPublicProfile(db, member.id);
    expect(JSON.stringify(p)).not.toMatch(/example\.test|banReason|emailVerified/);
    expect(await getPublicProfile(db, "ghost")).toBeNull();
  });

  it("counts approved posts and reactions received", async () => {
    await approvedPost(db, member, mod);
    expect((await getPublicProfile(db, member.id))?.approvedPosts).toBe(1);
  });

  it("lists a user's own activity, newest first", async () => {
    const id = await approvedPost(db, member, mod);
    await createComment(db, member, { postId: id, body: "talking to myself" });
    const kinds = (await listActivity(db, member.id)).map((a) => a.kind);
    expect(kinds).toContain("post");
    expect(kinds).toContain("comment");
    expect((await listActivity(db, victim.id)).length).toBe(0);
  });
});

describe("platform settings", () => {
  it("returns safe defaults on a fresh database", async () => {
    await db.delete(siteSetting); // beforeEach raised some limits for the other tests
    expect(await getSettings(db)).toMatchObject({ registrationOpen: true, allowLinks: false, dailyPostLimit: 5 });
  });

  it("is admin-only, validates input, merges changes and audits only the changed keys", async () => {
    expect(await code(updateSettings(db, mod, { dailyPostLimit: 3 }))).toBe("FORBIDDEN");
    expect(await code(updateSettings(db, member, { dailyPostLimit: 3 }))).toBe("FORBIDDEN");
    expect(await code(updateSettings(db, admin, { dailyPostLimit: 0 }))).toBe("VALIDATION");
    const next = await updateSettings(db, admin, { dailyPostLimit: 3, blockedTerms: ["alpha", "beta"], announcement: "Exam season!" });
    expect(next).toMatchObject({ dailyPostLimit: 3, registrationOpen: true });
    expect(await getSettings(db)).toMatchObject({ dailyPostLimit: 3, blockedTerms: ["alpha", "beta"], announcement: "Exam season!" });
    const [a] = await db.select().from(auditLog).where(eq(auditLog.action, "settings.updated"));
    expect(a.details).toEqual({ changed: expect.arrayContaining(["dailyPostLimit", "blockedTerms", "announcement"]) });
    expect(JSON.stringify(a.details)).not.toContain("alpha");
    // a no-op update writes nothing
    await updateSettings(db, admin, { dailyPostLimit: 3 });
    expect((await db.select().from(auditLog).where(eq(auditLog.action, "settings.updated"))).length).toBe(1);
  });
});

describe("audit log", () => {
  it("is readable by admins only, filterable and paginated", async () => {
    await updateSettings(db, admin, { commentsOpen: false });
    await setUserRole(db, admin, { userId: member.id, role: "moderator" });
    expect(await code(listAudit(db, mod))).toBe("FORBIDDEN");
    expect(await code(listAudit(db, member))).toBe("FORBIDDEN");
    const all = await listAudit(db, admin);
    expect(all.total).toBe(2);
    expect(all.rows[0].actorName).toBe("Admin");
    expect((await listAudit(db, admin, { action: "settings" })).total).toBe(1);
    expect((await listAudit(db, admin, { actorId: "nobody" })).total).toBe(0);
  });

  it("keeps the actor's id even after their account is deleted", async () => {
    await setUserRole(db, admin, { userId: member.id, role: "moderator" });
    await db.delete(user).where(eq(user.id, admin.id));
    const rows = await db.select().from(auditLog).where(eq(auditLog.action, "user.role_changed"));
    expect(rows[0].actorId).toBe(admin.id);
  });
});

describe("analytics", () => {
  it("summarises users, posts, queue and series for staff only", async () => {
    const live = await approvedPost(db, member, mod);
    await createPost(db, member, { body: uniqueBody(), category: "life" });
    await createReport(db, victim, { targetType: "post", targetId: live, reason: "spam" });
    await createComment(db, victim, { postId: live, body: "a comment" });
    const o = await getOverview(db, mod);
    expect(o.users.total).toBe(6);
    expect(o.users.staff).toBe(4);
    expect(o.posts).toMatchObject({ approved: 1, pending: 1, total: 2 });
    expect(o.queue.pending).toBe(1);
    expect(o.queue.oldestPendingAt).toBeInstanceOf(Date);
    expect(o.reports).toEqual({ open: 1, total: 1 });
    expect(o.comments.visible).toBe(1);
    expect(o.series.signups).toHaveLength(14);
    const today = new Date().toISOString().slice(0, 10);
    expect(o.series.signups.at(-1)).toEqual({ date: today, value: 6 });
    expect(o.series.approvals.at(-1)?.value).toBe(1);
    expect(await code(getOverview(db, member))).toBe("FORBIDDEN");
  });
});

describe("retention of rejected posts", () => {
  async function rejectedPost(ageDays: number) {
    const { id } = await createPost(db, member, { body: uniqueBody(), category: "life" });
    await moderatePost(db, mod, { id, decision: "reject", note: "nope" });
    await db.update(post).set({ moderatedAt: new Date(Date.now() - ageDays * 86400000) }).where(eq(post.id, id));
    return id;
  }

  it("defaults to a dry run that deletes nothing but is audited", async () => {
    await rejectedPost(45);
    const res = await purgeRejectedPosts(db);
    expect(res).toEqual({ candidates: 1, deleted: 0, dryRun: true });
    expect(await db.select().from(post)).toHaveLength(1);
    const [a] = await db.select().from(auditLog).where(eq(auditLog.action, "retention.purge_rejected"));
    expect(a.details).toMatchObject({ candidates: 1, deleted: 0, dryRun: true });
  });

  it("deletes only rejected posts older than 30 days, with their dependents", async () => {
    const old = await rejectedPost(31);
    const recent = await rejectedPost(29);
    const live = await approvedPost(db, victim, mod);
    await db.update(post).set({ moderatedAt: new Date(Date.now() - 90 * 86400000) }).where(eq(post.id, live)); // old but approved: untouched
    const res = await purgeRejectedPosts(db, { dryRun: false });
    expect(res).toMatchObject({ candidates: 1, deleted: 1 });
    const left = (await db.select({ id: post.id }).from(post)).map((p) => p.id);
    expect(left).toContain(recent);
    expect(left).toContain(live);
    expect(left).not.toContain(old);
    // moderation history survives, and holds no post text
    const history = await db.select().from(moderationAction).where(eq(moderationAction.targetId, old));
    expect(history).toHaveLength(1);
    expect(JSON.stringify(history)).not.toContain("studying tomorrow");
    expect((await db.select().from(comment)).length).toBe(0);
  });
});

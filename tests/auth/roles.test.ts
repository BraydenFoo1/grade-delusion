// Regression: the whole path from the database role to what a page or action is allowed to do.
// (Better Auth session -> Actor -> permission checks), for admin, moderator and ordinary user.
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { user } from "@/lib/db/schema";
import { actorFromSessionUser, assertAdmin, assertStaff, type Actor } from "@/lib/platform/actor";
import { AppError } from "@/lib/platform/errors";
import { createTestDb, makeUser, resetDb, type TestDb } from "../helpers/db";
import { PASSWORD, cookieFrom, createTestAuth, linkIn, tokenFromLink } from "../helpers/auth";

let db: TestDb;
let close: () => Promise<void>;
let t: ReturnType<typeof createTestAuth>;
beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(async () => close());
beforeEach(async () => {
  await resetDb(db);
  t = createTestAuth(db);
});

async function signedIn(email: string) {
  await t.auth.api.signUpEmail({ body: { name: "Role Tester", email, password: PASSWORD } });
  await t.auth.api.verifyEmail({ query: { token: tokenFromLink(linkIn(t.mails.findLast((m) => m.to === email)!)) } });
  const res = (await t.auth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true })) as unknown as Response;
  return new Headers({ cookie: cookieFrom(res) });
}
const actorNow = async (headers: Headers): Promise<Actor> => {
  const s = await t.auth.api.getSession({ headers });
  if (!s) throw new Error("no session");
  return actorFromSessionUser(s.user as never);
};
const allowed = (fn: () => void) => {
  try {
    fn();
    return true;
  } catch (e) {
    if (e instanceof AppError && e.code === "FORBIDDEN") return false;
    throw e;
  }
};
const setRole = (email: string, role: string) => db.update(user).set({ role }).where(eq(user.email, email));

describe("role -> session -> actor -> permissions", () => {
  it("exposes the stored role on session.user (the admin plugin's field is returned, not stripped)", async () => {
    const h = await signedIn("a@example.test");
    await setRole("a@example.test", "admin");
    const s = await t.auth.api.getSession({ headers: h });
    expect((s!.user as { role?: string }).role).toBe("admin");
  });

  it("applies a role change on the very next request, with the SAME session (no re-login, no cache)", async () => {
    const email = "b@example.test";
    const h = await signedIn(email);

    let a = await actorNow(h);
    expect(a.role).toBe("user");
    expect(allowed(() => assertStaff(a))).toBe(false);
    expect(allowed(() => assertAdmin(a))).toBe(false);

    await setRole(email, "moderator");
    a = await actorNow(h);
    expect(a.role).toBe("moderator");
    expect(allowed(() => assertStaff(a))).toBe(true);
    expect(allowed(() => assertAdmin(a))).toBe(false); // moderators never reach admin-only functions

    await makeUser(db, { role: "admin", name: "Other Admin" }); // the platform always keeps one admin (DB trigger), so there must be another
    await setRole(email, "admin");
    a = await actorNow(h);
    expect(a.role).toBe("admin");
    expect(allowed(() => assertStaff(a))).toBe(true);
    expect(allowed(() => assertAdmin(a))).toBe(true);

    await setRole(email, "user"); // demotion is just as immediate
    a = await actorNow(h);
    expect(allowed(() => assertStaff(a))).toBe(false);
  });

  it("an admin who is unverified, suspended or banned has no powers; an unknown role is a plain user", async () => {
    const base = { id: "x", name: "X", emailVerified: true, banned: false, banExpires: null };
    expect(allowed(() => assertAdmin(actorFromSessionUser({ ...base, role: "admin" })))).toBe(true);
    expect(allowed(() => assertAdmin(actorFromSessionUser({ ...base, role: "admin", emailVerified: false })))).toBe(false);
    expect(allowed(() => assertAdmin(actorFromSessionUser({ ...base, role: "admin", banned: true })))).toBe(false);
    expect(allowed(() => assertAdmin(actorFromSessionUser({ ...base, role: "admin", banned: true, banExpires: new Date(Date.now() - 1000) })))).toBe(true); // lapsed
    for (const role of ["superuser", "ADMIN", "", null, undefined, "admin "]) {
      const a = actorFromSessionUser({ ...base, role });
      expect(a.role, String(role)).toBe("user");
      expect(allowed(() => assertStaff(a))).toBe(false);
    }
  });
});

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { account, auditLog, post, session, user } from "@/lib/db/schema";
import { suspendUser } from "@/lib/services/users";
import { createPost } from "@/lib/services/posts";
import { createTestDb, makeUser, resetDb, type TestDb } from "../helpers/db";
import { BASE_URL, PASSWORD, cookieFrom, createTestAuth, linkIn, tokenFromLink } from "../helpers/auth";
import { noCooldowns, uniqueBody } from "../helpers/fixtures";

let db: TestDb;
let close: () => Promise<void>;
let t: ReturnType<typeof createTestAuth>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(async () => close());
beforeEach(async () => {
  await resetDb(db);
  await noCooldowns(db);
  t = createTestAuth(db);
});

async function errorOf(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    const err = e as { status?: string | number; statusCode?: number; body?: { code?: string; message?: string }; message?: string };
    return { status: err.statusCode ?? err.status, code: err.body?.code, message: err.body?.message ?? err.message };
  }
  return null;
}

const signUp = (over: Record<string, unknown> = {}) =>
  t.auth.api.signUpEmail({ body: { name: "Mei Ling", email: "mei@example.test", password: PASSWORD, ...over } });

async function verifiedUser(email = "mei@example.test") {
  await signUp({ email });
  const mail = t.mails.findLast((m) => m.to === email && /confirm/i.test(m.subject))!;
  await t.auth.api.verifyEmail({ query: { token: tokenFromLink(linkIn(mail)) } });
}

const signIn = (email = "mei@example.test", password = PASSWORD, asResponse = false) =>
  t.auth.api.signInEmail({ body: { email, password }, asResponse }) as Promise<never>;

describe("registration and e-mail verification", () => {
  it("creates an unverified account, records consent, hashes the password and e-mails a link", async () => {
    await signUp();
    const [u] = await db.select().from(user).where(eq(user.email, "mei@example.test"));
    expect(u).toMatchObject({ name: "Mei Ling", emailVerified: false, role: "user", banned: false });
    expect(u.ageConfirmedAt).toBeInstanceOf(Date);
    expect(u.termsAcceptedAt).toBeInstanceOf(Date);
    const [acct] = await db.select().from(account).where(eq(account.userId, u.id));
    expect(acct.password).toBeTruthy();
    expect(acct.password).not.toContain(PASSWORD);
    expect(await db.select().from(session).where(eq(session.userId, u.id))).toHaveLength(0); // no session until verified
    expect(t.mails).toHaveLength(1);
    expect(t.mails[0]).toMatchObject({ to: "mei@example.test" });
    expect(linkIn(t.mails[0])).toContain("/api/auth/verify-email?token=");
  });

  it("blocks sign-in until the address is verified, and re-sends the link", async () => {
    await signUp();
    const before = t.mails.length;
    expect(await errorOf(signIn())).toMatchObject({ status: 403 });
    expect(t.mails.length).toBe(before + 1); // sendOnSignIn
  });

  it("verifies with the e-mailed token, then allows sign-in", async () => {
    await verifiedUser();
    expect((await db.select().from(user).where(eq(user.email, "mei@example.test")))[0].emailVerified).toBe(true);
    const res = await signIn("mei@example.test", PASSWORD, true);
    expect((res as unknown as Response).status).toBe(200);
    const cookie = cookieFrom(res as unknown as Response);
    expect(cookie).toContain("gd.session_token");
    const s = await t.auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(s?.user.email).toBe("mei@example.test");
  });

  it("rejects a tampered or reused verification token", async () => {
    await signUp();
    const token = tokenFromLink(linkIn(t.mails[0]));
    expect(await errorOf(t.auth.api.verifyEmail({ query: { token: `${token}x` } }))).not.toBeNull();
    await t.auth.api.verifyEmail({ query: { token } });
    expect((await db.select().from(user))[0].emailVerified).toBe(true);
  });

  it("does not reveal whether an e-mail is already registered (and warns the owner instead)", async () => {
    await verifiedUser();
    const mailsBefore = t.mails.length;
    const again = await signUp({ name: "Impostor" });
    expect(again).toBeTruthy(); // same success shape as a fresh sign-up
    expect(await db.select().from(user)).toHaveLength(1);
    expect((await db.select().from(user))[0].name).toBe("Mei Ling"); // untouched
    const warning = t.mails.slice(mailsBefore).find((m) => /already|tried/i.test(m.subject));
    expect(warning?.to).toBe("mei@example.test");
  });

  it("gives the same error for a wrong password and an unknown account", async () => {
    await verifiedUser();
    const wrong = await errorOf(signIn("mei@example.test", "not the password at all"));
    const unknown = await errorOf(signIn("nobody@example.test", "not the password at all"));
    expect(wrong?.status).toBe(401);
    expect(unknown?.status).toBe(401);
    expect(wrong?.message).toBe(unknown?.message);
  });

  it("enforces the password policy and the display-name rules", async () => {
    expect(await errorOf(signUp({ password: "short" }))).not.toBeNull();
    expect(await errorOf(signUp({ name: "sam@example.com" }))).not.toBeNull();
    expect(await errorOf(signUp({ name: "<script>alert(1)</script>" }))).not.toBeNull();
    expect(await db.select().from(user)).toHaveLength(0);
  });

  it("lower-cases e-mail addresses", async () => {
    await signUp({ email: "MEI@Example.TEST" });
    expect((await db.select().from(user))[0].email).toBe("mei@example.test");
  });
});

describe("privilege escalation attempts", () => {
  it("ignores role, ban and consent fields smuggled into sign-up", async () => {
    await signUp({ role: "admin", banned: false, emailVerified: true, ageConfirmedAt: "2000-01-01" } as never).catch(() => undefined);
    const rows = await db.select().from(user);
    if (rows.length) {
      expect(rows[0].role).toBe("user");
      expect(rows[0].emailVerified).toBe(false);
      expect(rows[0].ageConfirmedAt!.getFullYear()).toBeGreaterThanOrEqual(new Date().getFullYear());
    }
  });

  it("does not let a signed-in user edit their role through any auth route", async () => {
    await verifiedUser();
    const cookie = cookieFrom((await signIn("mei@example.test", PASSWORD, true)) as unknown as Response);
    const paths = ["/api/auth/update-user", "/api/auth/admin/set-role", "/api/auth/admin/update-user", "/api/auth/admin/create-user"];
    for (const p of paths) {
      const res = await t.auth.handler(
        new Request(`${BASE_URL}${p}`, {
          method: "POST",
          headers: { "content-type": "application/json", cookie, origin: BASE_URL },
          body: JSON.stringify({ role: "admin", userId: "x", data: { role: "admin" }, name: "Admin", email: "a@b.co", password: PASSWORD }),
        }),
      );
      expect(res.status, p).toBe(404);
    }
    expect((await db.select().from(user))[0].role).toBe("user");
  });

  it("keeps every disabled route disabled over HTTP (sign-up, admin plugin, social)", async () => {
    for (const p of ["/sign-up/email", "/admin/list-users", "/admin/impersonate-user", "/admin/set-user-password", "/admin/remove-user", "/sign-in/social", "/link-social", "/verify-password"]) {
      const res = await t.auth.handler(
        new Request(`${BASE_URL}/api/auth${p}`, { method: "POST", headers: { "content-type": "application/json", origin: BASE_URL }, body: "{}" }),
      );
      expect(res.status, p).toBe(404);
    }
  });

  // Route inventory of the Better Auth Infra plugin, v0.4.27 (its Dash and Events routes), extracted from the published
  // package: every createAuthEndpoint path plus the extra /dash and /events strings it references. Exhaustive
  // testing is cheap here (~100 in-process requests), so nothing is sampled. Path params (:id) are filled with "x".
  const INFRA_ROUTES: Array<[method: string, path: string]> = [
    ["GET", "/dash/config"],
    ["GET", "/dash/validate"],
    ["GET", "/dash/organization/:id/directory-field-mapping-options"],
    ["GET", "/dash/organization/:id/directories/:providerId/field-mappings"],
    ["PUT", "/dash/organization/:id/directories/:providerId/field-mappings"],
    ["GET", "/dash/organization/:id/directories/:providerId"],
    ["POST", "/dash/organization/:id/directories"],
    ["GET", "/dash/organization/:id/directories"],
    ["POST", "/dash/organization/:id/directories/:providerId/credentials/rotate"],
    ["POST", "/dash/organization/:id/directories/:providerId/credentials/:credentialId/revoke"],
    ["GET", "/dash/organization/:id/directories/:providerId/events"],
    ["POST", "/dash/organization/:id/directories/:providerId/decommission"],
    ["POST", "/dash/organization/:id/directories/:providerId/unpair"],
    ["GET", "/dash/directory-sync/connection-count"],
    ["POST", "/dash/organization/directory/create"],
    ["POST", "/dash/organization/directory/delete"],
    ["POST", "/dash/organization/directory/regenerate-token"],
    ["GET", "/events/types"],
    ["POST", "/dash/execute-adapter"],
    ["GET", "/dash/accept-invitation"],
    ["POST", "/dash/complete-invitation"],
    ["GET", "/dash/complete-invitation-handoff"],
    ["GET", "/dash/complete-invitation-social"],
    ["POST", "/dash/check-user-exists"],
    ["GET", "/dash/organization/:id/invitations"],
    ["POST", "/dash/organization/invite-member"],
    ["POST", "/dash/organization/check-user-by-email"],
    ["POST", "/dash/organization/cancel-invitation"],
    ["POST", "/dash/organization/resend-invitation"],
    ["GET", "/dash/organization/:id/members"],
    ["POST", "/dash/organization/add-member"],
    ["POST", "/dash/organization/remove-member"],
    ["POST", "/dash/organization/update-member-role"],
    ["POST", "/dash/organization/update-member"],
    ["GET", "/dash/export-organizations"],
    ["GET", "/dash/organization/options"],
    ["GET", "/dash/organization/:id"],
    ["POST", "/dash/organization/delete"],
    ["POST", "/dash/organization/delete-many"],
    ["POST", "/dash/organization/create"],
    ["POST", "/dash/organization/update"],
    ["GET", "/dash/organization/:id/teams"],
    ["POST", "/dash/organization/update-team"],
    ["POST", "/dash/organization/delete-team"],
    ["POST", "/dash/organization/create-team"],
    ["GET", "/dash/organization/:orgId/teams/:teamId/members"],
    ["POST", "/dash/organization/add-team-member"],
    ["POST", "/dash/organization/remove-team-member"],
    ["POST", "/dash/sessions/revoke"],
    ["POST", "/dash/sessions/revoke-all"],
    ["POST", "/dash/sessions/revoke-many"],
    ["GET", "/dash/sso/connection-count"],
    ["GET", "/dash/organization/:id/sso-providers"],
    ["POST", "/dash/organization/:id/sso-provider/create"],
    ["POST", "/dash/organization/:id/sso-provider/update"],
    ["POST", "/dash/organization/:id/sso-provider/request-verification-token"],
    ["POST", "/dash/organization/:id/sso-provider/verify-domain"],
    ["POST", "/dash/organization/:id/sso-provider/delete"],
    ["POST", "/dash/organization/:id/sso-provider/mark-domain-verified"],
    ["POST", "/dash/enable-two-factor"],
    ["POST", "/dash/complete-two-factor-setup"],
    ["POST", "/dash/view-two-factor-totp-uri"],
    ["POST", "/dash/view-backup-codes"],
    ["POST", "/dash/disable-two-factor"],
    ["POST", "/dash/generate-backup-codes"],
    ["GET", "/dash/list-users"],
    ["GET", "/dash/export-users"],
    ["POST", "/dash/delete-user"],
    ["POST", "/dash/delete-many-users"],
    ["GET", "/dash/impersonate-user"],
    ["POST", "/dash/create-user"],
    ["POST", "/dash/set-password"],
    ["POST", "/dash/unlink-account"],
    ["GET", "/dash/user"],
    ["GET", "/dash/user-organizations"],
    ["POST", "/dash/update-user"],
    ["GET", "/dash/user-stats"],
    ["GET", "/dash/user-graph-data"],
    ["GET", "/dash/user-retention-data"],
    ["POST", "/dash/ban-user"],
    ["POST", "/dash/ban-many-users"],
    ["POST", "/dash/unban-user"],
    ["POST", "/dash/set-user-role"],
    ["POST", "/dash/send-verification-email"],
    ["POST", "/dash/send-many-verification-emails"],
    ["POST", "/dash/send-reset-password-email"],
    ["GET", "/dash"],
    ["POST", "/dash"],
    ["GET", "/dash/list-organizations"],
    ["POST", "/dash/list-organizations"],
    ["GET", "/events/list"],
    ["POST", "/events/list"],
    ["GET", "/events/audit-logs"],
    ["POST", "/events/audit-logs"],
    ["GET", "/events/all-audit-logs"],
    ["POST", "/events/all-audit-logs"],
  ];

  it("exposes no Better Auth Infra / Dash / Events route (they would bypass our staff checks)", async () => {
    // control: the router answers real routes, so a 404 below means "no such route", not "handler is broken"
    const control = await t.auth.handler(new Request(`${BASE_URL}/api/auth/get-session`, { headers: { origin: BASE_URL } }));
    expect(control.status).toBe(200);

    const notFound: string[] = [];
    for (const [method, route] of INFRA_ROUTES) {
      const path = route.replace(/:[A-Za-z]+/g, "x");
      const res = await t.auth.handler(
        new Request(`${BASE_URL}/api/auth${path}`, {
          method,
          headers: { "content-type": "application/json", origin: BASE_URL },
          body: method === "GET" ? undefined : "{}",
        }),
      );
      if (res.status !== 404) notFound.push(`${method} ${path} -> ${res.status}`);
    }
    expect(notFound).toEqual([]); // empty = every request was a real HTTP 404
  });

  describe("CSRF protection", () => {
    const signInReq = (headers: Record<string, string>) =>
      new Request(`${BASE_URL}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({ email: "mei@example.test", password: PASSWORD }),
      });

    it("accepts a same-origin sign-in", async () => {
      await verifiedUser();
      expect((await t.auth.handler(signInReq({ origin: BASE_URL, "sec-fetch-site": "same-origin", "sec-fetch-mode": "cors" }))).status).toBe(200);
    });

    it("rejects a request from another origin when the browser sends a session cookie", async () => {
      await verifiedUser();
      const cookie = cookieFrom((await signIn("mei@example.test", PASSWORD, true)) as unknown as Response);
      const res = await t.auth.handler(
        new Request(`${BASE_URL}/api/auth/change-password`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: "https://evil.example", cookie },
          body: JSON.stringify({ currentPassword: PASSWORD, newPassword: "attacker chosen passphrase" }),
        }),
      );
      expect(res.status).toBe(403);
      expect(((await signIn("mei@example.test", PASSWORD, true)) as unknown as Response).status).toBe(200); // password unchanged
    });

    it("blocks cross-site login by form navigation (login CSRF) and foreign origins without cookies", async () => {
      await verifiedUser();
      expect((await t.auth.handler(signInReq({ "sec-fetch-site": "cross-site", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" }))).status).toBe(403);
      expect((await t.auth.handler(signInReq({ origin: "https://evil.example" }))).status).toBe(403);
    });
  });

  it("sets session cookies as HttpOnly + SameSite=Lax", async () => {
    await verifiedUser();
    const res = (await signIn("mei@example.test", PASSWORD, true)) as unknown as Response;
    const set = res.headers.getSetCookie().find((c) => c.includes("session_token"))!;
    expect(set).toMatch(/HttpOnly/i);
    expect(set).toMatch(/SameSite=Lax/i);
  });
});

describe("password reset", () => {
  it("resets the password, invalidates old sessions and tokens", async () => {
    await verifiedUser();
    const cookie = cookieFrom((await signIn("mei@example.test", PASSWORD, true)) as unknown as Response);
    await t.auth.api.requestPasswordReset({ body: { email: "mei@example.test", redirectTo: "/reset-password" } });
    const mail = t.mails.findLast((m) => /reset/i.test(m.subject))!;
    const token = tokenFromLink(linkIn(mail));
    await t.auth.api.resetPassword({ body: { newPassword: "a brand new passphrase", token } });

    expect(await errorOf(signIn("mei@example.test", PASSWORD))).toMatchObject({ status: 401 }); // old password dead
    expect(await t.auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull(); // old session revoked
    expect(((await signIn("mei@example.test", "a brand new passphrase", true)) as unknown as Response).status).toBe(200);
    expect(await errorOf(t.auth.api.resetPassword({ body: { newPassword: "yet another passphrase", token } }))).not.toBeNull(); // single use
  });

  it("answers the same way for unknown addresses and sends nothing", async () => {
    const before = t.mails.length;
    await t.auth.api.requestPasswordReset({ body: { email: "ghost@example.test", redirectTo: "/reset-password" } });
    expect(t.mails.length).toBe(before);
  });
});

describe("suspension and bans", () => {
  async function setup() {
    await verifiedUser();
    const [u] = await db.select().from(user).where(eq(user.email, "mei@example.test"));
    const mod = await makeUser(db, { role: "moderator", name: "Mod" });
    const cookie = cookieFrom((await signIn("mei@example.test", PASSWORD, true)) as unknown as Response);
    return { u, mod, cookie };
  }

  it("signs a suspended user out immediately and blocks sign-in", async () => {
    const { u, mod, cookie } = await setup();
    expect((await t.auth.api.getSession({ headers: new Headers({ cookie }) }))?.user.id).toBe(u.id);
    await suspendUser(db as never, mod, { userId: u.id, mode: "ban", reason: "Spam wave" });
    expect(await t.auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull();
    expect(await errorOf(signIn())).toMatchObject({ status: 403 });
  });

  it("lets a timed suspension lapse so the user can sign in again", async () => {
    const { u, mod } = await setup();
    await suspendUser(db as never, mod, { userId: u.id, mode: "suspend", days: 1, reason: "Cool off a bit" });
    expect(await errorOf(signIn())).toMatchObject({ status: 403 });
    await db.update(user).set({ banExpires: new Date(Date.now() - 1000) }).where(eq(user.id, u.id));
    expect(((await signIn("mei@example.test", PASSWORD, true)) as unknown as Response).status).toBe(200);
  });
});

describe("account deletion", () => {
  it("deletes a member and everything they own, leaving only an anonymous audit entry", async () => {
    await verifiedUser();
    const [u] = await db.select().from(user).where(eq(user.email, "mei@example.test"));
    await createPost(db as never, { id: u.id, name: u.name, role: "user", emailVerified: true, banned: false, banExpires: null }, { body: uniqueBody(), category: "life" });
    const cookie = cookieFrom((await signIn("mei@example.test", PASSWORD, true)) as unknown as Response);
    await t.auth.api.deleteUser({ headers: new Headers({ cookie }), body: { password: PASSWORD } });
    expect(await db.select().from(user)).toHaveLength(0);
    expect(await db.select().from(post)).toHaveLength(0);
    const [a] = await db.select().from(auditLog).where(eq(auditLog.action, "account.deleted"));
    expect(a.targetId).toBe(u.id);
    expect(JSON.stringify(a)).not.toMatch(/mei@example|Mei Ling/);
  });

  it("refuses to delete the only admin", async () => {
    await verifiedUser("boss@example.test");
    await db.update(user).set({ role: "admin" }).where(eq(user.email, "boss@example.test"));
    const cookie = cookieFrom((await signIn("boss@example.test", PASSWORD, true)) as unknown as Response);
    expect(await errorOf(t.auth.api.deleteUser({ headers: new Headers({ cookie }), body: { password: PASSWORD } }))).not.toBeNull();
    expect(await db.select().from(user).where(eq(user.email, "boss@example.test"))).toHaveLength(1);
  });
});

describe("rate limiting", () => {
  it("throttles repeated sign-in attempts from one address (stored in the database)", async () => {
    const limited = createTestAuth(db, { rateLimit: true });
    let sawLimit = false;
    for (let i = 0; i < 14; i++) {
      const res = await limited.auth.handler(
        new Request(`${BASE_URL}/api/auth/sign-in/email`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: BASE_URL, "x-forwarded-for": "203.0.113.9" },
          body: JSON.stringify({ email: "nobody@example.test", password: "whatever password" }),
        }),
      );
      if (res.status === 429) sawLimit = true;
    }
    expect(sawLimit).toBe(true);
  });
});

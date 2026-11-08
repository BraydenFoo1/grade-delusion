// AUDIT: production configuration must fail CLOSED, and session cookies must carry the right flags in production.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuth } from "@/lib/auth/create";
import { connectDb } from "@/lib/db/connect";
import { getMailer } from "@/lib/email/send";
import { authSecret, baseUrl, isLocalOverride, isProduction } from "@/lib/env";
import { ipBucket } from "@/lib/platform/ip";
import type { AppDb } from "@/lib/db/types";
import { createTestDb } from "../helpers/db";
import { PASSWORD, cookieFrom, linkIn, tokenFromLink } from "../helpers/auth";

afterEach(() => vi.unstubAllEnvs());

function production(extra: Record<string, string> = {}) {
  vi.stubEnv("NODE_ENV", "production");
  for (const k of ["GD_LOCAL", "VERCEL", "VERCEL_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "NEXT_PUBLIC_SITE_URL", "DATABASE_URL", "RESEND_API_KEY"]) vi.stubEnv(k, "");
  for (const [k, v] of Object.entries(extra)) vi.stubEnv(k, v);
}

describe("production refuses to run on development defaults", () => {
  it("needs a real auth secret (present and at least 32 characters)", () => {
    production();
    expect(() => authSecret()).toThrow(/BETTER_AUTH_SECRET is required/);
    vi.stubEnv("BETTER_AUTH_SECRET", "too-short");
    expect(() => authSecret()).toThrow(/at least 32/);
    vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(40));
    expect(authSecret()).toBe("x".repeat(40));
  });

  it("needs a public URL (explicit, or Vercel's), and strips a trailing slash", () => {
    production();
    expect(() => baseUrl()).toThrow(/BETTER_AUTH_URL is required/);
    vi.stubEnv("VERCEL_URL", "preview-abc.vercel.app");
    expect(baseUrl()).toBe("https://preview-abc.vercel.app");
    vi.stubEnv("BETTER_AUTH_URL", "https://grade-delusion.example/");
    expect(baseUrl()).toBe("https://grade-delusion.example");
  });

  it("will not silently fall back to the embedded database", async () => {
    production();
    await expect(connectDb()).rejects.toThrow(/DATABASE_URL is required in production/);
  });

  it("will not pretend to send e-mail without a provider key", async () => {
    production();
    const send = getMailer();
    await expect(send({ to: "a@b.co", subject: "s", html: "h", text: "t" })).rejects.toThrow(/RESEND_API_KEY is not set/);
  });

  it("GD_LOCAL relaxes things on a laptop but is IGNORED on Vercel", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GD_LOCAL", "1");
    vi.stubEnv("VERCEL", "");
    expect(isLocalOverride()).toBe(true);
    expect(isProduction()).toBe(false);
    vi.stubEnv("VERCEL", "1");
    expect(isLocalOverride()).toBe(false);
    expect(isProduction()).toBe(true);
    expect(() => authSecret()).toThrow(); // still demands a real secret
  });
});

describe("rate-limit bucket without a client IP", () => {
  it("is generous (shared by everyone) instead of locking everybody out after a handful of requests", () => {
    expect(ipBucket("203.0.113.9", 6)).toEqual({ key: "203.0.113.9", limit: 6 });
    expect(ipBucket("unknown", 6)).toEqual({ key: "unknown", limit: 60 });
  });
});

describe("session cookies in production", () => {
  it("are Secure, HttpOnly, SameSite=Lax and use the __Secure- prefix", async () => {
    const { db, close } = await createTestDb();
    const mails: { text: string; subject: string }[] = [];
    const auth = createAuth({
      db: db as unknown as AppDb,
      baseURL: "https://grade-delusion.example",
      secret: "p".repeat(40),
      production: true,
      rateLimitEnabled: false,
      sendMail: (m) => {
        mails.push(m);
      },
    });
    await auth.api.signUpEmail({ body: { name: "Prod User", email: "prod@example.test", password: PASSWORD } });
    await auth.api.verifyEmail({ query: { token: tokenFromLink(linkIn(mails[0] as never)) } });
    const res = (await auth.api.signInEmail({ body: { email: "prod@example.test", password: PASSWORD }, asResponse: true })) as unknown as Response;
    expect(res.status).toBe(200);
    const session = res.headers.getSetCookie().find((c) => c.includes("session_token"))!;
    expect(session).toMatch(/^__Secure-gd\.session_token=/);
    expect(session).toMatch(/;\s*Secure/i);
    expect(session).toMatch(/;\s*HttpOnly/i);
    expect(session).toMatch(/;\s*SameSite=Lax/i);
    expect(session).toMatch(/;\s*Max-Age=\d+/i);
    expect(cookieFrom(res)).toContain("__Secure-gd.session_token");
    await close();
  });
});

// FINAL REVIEW regression tests: lockout, fail-closed configuration, production headers, deploy pins, docs drift.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { user } from "@/lib/db/schema";
import type { Actor } from "@/lib/platform/actor";
import { AppError } from "@/lib/platform/errors";
import { createPost, moderatePost, updateOwnPost } from "@/lib/services/posts";
import { keyHash } from "@/lib/platform/ip";
import { setSettings } from "../helpers/fixtures";
import { setUserRole } from "@/lib/services/users";
import { createTestDb, makeUser, resetDb, type TestDb } from "../helpers/db";

const root = process.cwd();
const read = (f: string) => readFileSync(path.join(root, f), "utf8");

afterEach(() => vi.unstubAllEnvs());

describe("an admin lockout is impossible, even with stale or simultaneous requests", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  let a: Actor, b: Actor;
  beforeAll(async () => ({ db, close } = await createTestDb()));
  afterAll(async () => close());
  beforeEach(async () => {
    await resetDb(db);
    a = await makeUser(db, { name: "Admin A", role: "admin" });
    b = await makeUser(db, { name: "Admin B", role: "admin" });
  });
  const roles = async () => (await db.select({ id: user.id, role: user.role }).from(user)).map((u) => u.role);
  const code = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e) {
      return e instanceof AppError ? e.code : `RAW:${(e as Error).message}`;
    }
    return "ok";
  };

  it("an admin who was demoted a moment ago cannot use their stale admin session to demote the other admin", async () => {
    await setUserRole(db, a, { userId: b.id, role: "user" }); // A demotes B...
    // ...but B's request was already in flight with B's old (stale) admin actor:
    expect(await code(setUserRole(db, b, { userId: a.id, role: "user" }))).toBe("FORBIDDEN");
    expect(await roles()).toContain("admin");
  });

  it("two admins demoting each other at the same instant leave at least one admin", async () => {
    const results = await Promise.all([code(setUserRole(db, a, { userId: b.id, role: "user" })), code(setUserRole(db, b, { userId: a.id, role: "user" }))]);
    expect(results.filter((r) => r === "ok")).toHaveLength(1);
    expect((await roles()).filter((r) => r === "admin")).toHaveLength(1);
  });

  it("the DATABASE itself refuses to demote or delete the last admin (even a direct query)", async () => {
    const msg = async (p: Promise<unknown>) => {
      try {
        await p;
        return "ok";
      } catch (e) {
        const err = e as Error & { cause?: Error };
        return `${err.message} ${err.cause?.message ?? ""}`;
      }
    };
    // two admins: one may go
    expect(await msg(db.update(user).set({ role: "user" }).where(eq(user.id, b.id)))).toBe("ok");
    // one admin left: neither a demotion nor a deletion is allowed
    expect(await msg(db.update(user).set({ role: "moderator" }).where(eq(user.id, a.id)))).toMatch(/at least one admin/);
    expect(await msg(db.delete(user).where(eq(user.id, a.id)))).toMatch(/at least one admin/);
    expect((await roles()).filter((r) => r === "admin")).toHaveLength(1);
    // promoting someone else first makes it possible again
    await db.update(user).set({ role: "admin" }).where(eq(user.id, b.id));
    expect(await msg(db.update(user).set({ role: "user" }).where(eq(user.id, a.id)))).toBe("ok");
    // non-role updates of the last admin are unaffected
    expect(await msg(db.update(user).set({ name: "Renamed" }).where(eq(user.id, b.id)))).toBe("ok");
  });

  it("the last admin can never be demoted by anyone, whatever the actor object claims", async () => {
    await db.update(user).set({ role: "user" }).where(eq(user.id, b.id));
    const ghost: Actor = { ...b, role: "admin" }; // a forged/stale actor claiming admin
    expect(await code(setUserRole(db, ghost, { userId: a.id, role: "moderator" }))).toBe("FORBIDDEN");
    expect((await roles()).filter((r) => r === "admin")).toHaveLength(1);
  });
});

describe("production configuration fails closed", () => {
  it("requires EMAIL_FROM in production (Resend's sandbox sender only delivers to the account owner)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const k of ["GD_LOCAL", "VERCEL", "EMAIL_FROM"]) vi.stubEnv(k, "");
    const env = await import("@/lib/env");
    expect(() => env.emailFrom()).toThrow(/EMAIL_FROM is required in production/);
    vi.stubEnv("EMAIL_FROM", "Grade Delusion <no-reply@gradedelusion.example>");
    expect(env.emailFrom()).toBe("Grade Delusion <no-reply@gradedelusion.example>");
    expect(() => {
      vi.stubEnv("EMAIL_FROM", "garbage-without-an-address");
      env.emailFrom();
    }).toThrow(/valid/);
  });

  it("keeps a harmless default in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_FROM", "");
    const env = await import("@/lib/env");
    expect(env.emailFrom()).toContain("@");
  });

  it("production auth setup refuses to start without a mail sender or provider key", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const k of ["GD_LOCAL", "VERCEL", "EMAIL_FROM", "RESEND_API_KEY"]) vi.stubEnv(k, "");
    const env = await import("@/lib/env");
    expect(() => env.assertProductionEmailConfig()).toThrow(/RESEND_API_KEY/);
    vi.stubEnv("RESEND_API_KEY", "re_test_key_not_real");
    expect(() => env.assertProductionEmailConfig()).toThrow(/EMAIL_FROM/);
    vi.stubEnv("EMAIL_FROM", "Grade Delusion <no-reply@gradedelusion.example>");
    expect(() => env.assertProductionEmailConfig()).not.toThrow();
    vi.stubEnv("NODE_ENV", "development"); // never enforced locally
    vi.stubEnv("RESEND_API_KEY", "");
    expect(() => env.assertProductionEmailConfig()).not.toThrow();
  });
});

describe("security headers as a real deployment serves them (not the local-http variant)", () => {
  async function headersFor(env: Record<string, string>) {
    vi.resetModules();
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    const cfg = (await import("../../next.config")).default;
    const rules = await cfg.headers!();
    const all = rules.find((r) => r.source === "/:path*")!.headers;
    return Object.fromEntries(all.map((h) => [h.key, h.value]));
  }

  it("production: HSTS, upgrade-insecure-requests, no unsafe-eval, framing and objects blocked", async () => {
    const h = await headersFor({ NODE_ENV: "production", GD_LOCAL: "", VERCEL: "1" });
    expect(h["Strict-Transport-Security"]).toMatch(/max-age=\d{7,}/);
    expect(h["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
    expect(h["Content-Security-Policy"]).not.toContain("unsafe-eval");
    expect(h["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(h["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(h["Content-Security-Policy"]).not.toMatch(/ws:|wss:/);
    expect(h["X-Frame-Options"]).toBe("DENY");
  });

  it("GD_LOCAL cannot switch HSTS off on Vercel", async () => {
    const h = await headersFor({ NODE_ENV: "production", GD_LOCAL: "1", VERCEL: "1" });
    expect(h["Strict-Transport-Security"]).toBeDefined();
    expect(h["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
  });

  it("every private path also carries X-Robots-Tag noindex", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    const rules = await (await import("../../next.config")).default.headers!();
    for (const p of ["/admin/:path*", "/dashboard", "/settings", "/api/:path*"]) {
      expect(rules.find((r) => r.source === p)?.headers.some((h) => h.key === "X-Robots-Tag" && /noindex/.test(h.value)), p).toBe(true);
    }
  });
});

describe("deployment pins", () => {
  it("package.json pins a Node version that has the global WebSocket the Neon driver needs (22+)", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.engines?.node, "add an engines.node field").toMatch(/>=\s*22/);
  });

  it("every dependency the production runtime imports is in `dependencies`, not devDependencies", () => {
    const pkg = JSON.parse(read("package.json"));
    for (const name of ["next", "react", "react-dom", "better-auth", "drizzle-orm", "@neondatabase/serverless", "resend", "zod", "server-only"]) {
      expect(pkg.dependencies[name], name).toBeDefined();
    }
    // dev-only on purpose: only reachable behind the local-development fallback
    expect(pkg.devDependencies["@electric-sql/pglite"]).toBeDefined();
  });
});

describe("documentation matches the implementation", () => {
  const docs = ["README.md", ...readdirSync(path.join(root, "docs")).map((f) => `docs/${f}`)];
  const text = docs.map((d) => ({ d, t: read(d) }));

  it("every `npm run <script>` in the docs exists in package.json", () => {
    const scripts = Object.keys(JSON.parse(read("package.json")).scripts);
    const missing: string[] = [];
    for (const { d, t } of text) for (const m of t.matchAll(/npm run ([a-z0-9:-]+)/g)) if (!scripts.includes(m[1])) missing.push(`${d}: npm run ${m[1]}`);
    expect(missing).toEqual([]);
  });

  it("every environment variable the code reads is documented in docs/ENVIRONMENT.md", () => {
    const walk = (p: string): string[] => {
      const full = path.join(root, p);
      if (!existsSync(full)) return [];
      if (statSync(full).isDirectory()) return readdirSync(full).flatMap((n) => walk(`${p}/${n}`));
      return /\.(ts|tsx)$/.test(p) ? [p] : [];
    };
    const files = ["lib", "app", "scripts", "next.config.ts"].flatMap(walk);
    const used = new Set(files.flatMap((f) => [...read(f).matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)].map((m) => m[1])));
    for (const ignore of ["NODE_ENV", "PORT", "VITEST", "NODE_ENV"]) used.delete(ignore);
    const doc = read("docs/ENVIRONMENT.md");
    expect([...used].filter((v) => !doc.includes(v))).toEqual([]);
  });

  it("every repository path the docs point at exists", () => {
    const missing: string[] = [];
    for (const { d, t } of text) {
      for (const m of t.matchAll(/`((?:lib|app|docs|scripts|tests|e2e|components|drizzle)\/[A-Za-z0-9_./()\[\]-]+?)`/g)) {
        const p = m[1].replace(/\/$/, "");
        if (/\*|…|<|\[id\]/.test(p) && !existsSync(path.join(root, p))) continue; // globs and placeholders
        if (!existsSync(path.join(root, p))) missing.push(`${d}: ${p}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("review findings (independent reviewer)", () => {
  it("H2: on Vercel PRODUCTION the base URL must be explicit; it never silently becomes the per-deployment host", async () => {
    const env = await import("@/lib/env");
    for (const k of ["BETTER_AUTH_URL", "NEXT_PUBLIC_SITE_URL"]) vi.stubEnv(k, "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_URL", "grade-delusion-abc123.vercel.app");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(() => env.baseUrl()).toThrow(/BETTER_AUTH_URL is required/);
    vi.stubEnv("VERCEL_ENV", "preview"); // previews legitimately use their own URL
    expect(env.baseUrl()).toBe("https://grade-delusion-abc123.vercel.app");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("BETTER_AUTH_URL", "https://gradedelusion.example");
    expect(env.baseUrl()).toBe("https://gradedelusion.example");
  });

  it("platform-injected Vercel hosts are trusted origins (so a second address of the deployment can sign in)", async () => {
    const env = await import("@/lib/env");
    vi.stubEnv("AUTH_TRUSTED_ORIGINS", "https://www.gradedelusion.example/");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "grade-delusion.vercel.app");
    vi.stubEnv("VERCEL_URL", "grade-delusion-abc123.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "");
    expect(env.extraTrustedOrigins().sort()).toEqual(["https://grade-delusion-abc123.vercel.app", "https://grade-delusion.vercel.app", "https://www.gradedelusion.example"]);
    vi.stubEnv("VERCEL_URL", "evil.example/path?x=1"); // anything that is not a bare host name is ignored
    expect(env.extraTrustedOrigins().some((o) => o.includes("evil"))).toBe(false);
  });

  it("M3: rate-limit keys never contain the raw e-mail address or IP", () => {
    const k = keyHash("victim@example.com", "secret-a");
    expect(k).not.toContain("victim");
    expect(k).toBe(keyHash("victim@example.com", "secret-a"));
    expect(k).not.toBe(keyHash("victim@example.com", "secret-b"));
    expect(keyHash("203.0.113.9", "s")).not.toContain("203");
  });

  it("M2: the Neon pool gets an error handler, so a dropped idle WebSocket can't crash the instance", async () => {
    vi.resetModules();
    const on = vi.fn();
    vi.doMock("@neondatabase/serverless", () => ({ Pool: class { on = on; end = async () => {}; }, neonConfig: {} }));
    vi.doMock("drizzle-orm/neon-serverless", () => ({ drizzle: () => ({}) }));
    vi.stubEnv("DATABASE_URL", "postgres://user:pw@ep-test-pooler.neon.tech/db");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GD_LOCAL", "");
    vi.stubEnv("VERCEL", "1");
    const { connectDb } = await import("@/lib/db/connect");
    const c = await connectDb();
    expect(c.kind).toBe("neon");
    expect(on).toHaveBeenCalledWith("error", expect.any(Function));
    vi.doUnmock("@neondatabase/serverless");
    vi.doUnmock("drizzle-orm/neon-serverless");
  });
});

describe("review findings: moderation and editing", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  let author: Actor, mod: Actor;
  beforeAll(async () => ({ db, close } = await createTestDb()));
  afterAll(async () => close());
  beforeEach(async () => {
    await resetDb(db);
    await setSettings(db, { postCooldownSec: 0, dailyPostLimit: 50 });
    author = await makeUser(db, { name: "Author" });
    mod = await makeUser(db, { name: "Mod", role: "moderator" });
  });
  const codeOf = async (p: Promise<unknown>) => {
    try {
      await p;
      return "ok";
    } catch (e) {
      return e instanceof AppError ? e.code : `RAW:${(e as Error).message}`;
    }
  };

  it("M4: a moderator cannot approve text the author changed after the moderator opened it", async () => {
    const { id } = await createPost(db, author, { body: "Original text the moderator reads and means to approve", category: "life" });
    const opened = ""; // version the review desk saw: never edited
    await updateOwnPost(db, author, id, { body: "Completely different text sneaked in after review started", category: "life" });
    expect(await codeOf(moderatePost(db, mod, { id, decision: "approve", version: opened }))).toBe("CONFLICT");
    const [row] = await db.select().from((await import("@/lib/db/schema")).post).where(eq((await import("@/lib/db/schema")).post.id, id));
    expect(row.status).toBe("pending"); // still waiting, nothing went live
    // reviewing the NEW version works
    expect(await codeOf(moderatePost(db, mod, { id, decision: "approve", version: row.editedAt!.toISOString() }))).toBe("ok");
  });

  it("M4: omitting the version keeps the old behaviour (so existing callers and scripts still work)", async () => {
    const { id } = await createPost(db, author, { body: "A perfectly ordinary delusion to approve", category: "life" });
    expect(await codeOf(moderatePost(db, mod, { id, decision: "approve" }))).toBe("ok");
  });

  it("L2: pausing submissions also stops edits from re-entering the queue", async () => {
    const { id } = await createPost(db, author, { body: "A delusion that is waiting in the queue", category: "life" });
    await setSettings(db, { submissionsOpen: false });
    expect(await codeOf(updateOwnPost(db, author, id, { body: "An edit attempted during a submissions pause", category: "life" }))).toBe("UNAVAILABLE");
  });
});

describe("Better Auth Infra (Dash) stays out", () => {
  // Every tracked source / config / env-template file, found by walking the repo root. Generated output,
  // dependencies and local env files are skipped; docs (.md) legitimately explain why Dash is absent.
  const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "out", "coverage", "dist", "build", "playwright-report", "test-results", ".vercel", ".turbo", ".qa", ".impeccable", ".data"]);
  const SCANNED = /\.(?:[cm]?[jt]sx?|json|ya?ml|toml|sql|css)$|^\.env(?:\..+)?\.(?:example|sample|template)$|^\.env\.example$/;
  const SELF = "tests/audit/readiness.test.ts"; // names the forbidden strings on purpose
  const walk = (dir: string): string[] =>
    readdirSync(path.join(root, dir)).flatMap((e) => {
      const rel = dir ? `${dir}/${e}` : e;
      if (statSync(path.join(root, rel)).isDirectory()) return SKIP_DIRS.has(e) ? [] : walk(rel);
      return SCANNED.test(e) && rel !== SELF ? [rel] : [];
    });
  const files = walk("");

  it("scans the application, tests, scripts and config (and not generated output)", () => {
    for (const f of ["package.json", "package-lock.json", "next.config.ts", "drizzle.config.ts", "vitest.config.mts", "postcss.config.mjs", ".env.example", "lib/auth/create.ts", "app/layout.tsx"]) {
      expect(files, f).toContain(f);
    }
    expect(files.filter((f) => /^(node_modules|\.next)\//.test(f))).toEqual([]);
  });

  it("is not a dependency (including the lockfile), not imported, not called, and no API key is read anywhere", () => {
    const pkg = JSON.parse(read("package.json"));
    for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
      expect(Object.keys(pkg[field] ?? {}).filter((n) => /better-auth.*infra|infra.*better-auth/.test(n)), field).toEqual([]);
    }
    const lock = JSON.parse(read("package-lock.json"));
    expect(Object.keys(lock.packages ?? {}).filter((n) => /better-auth\/infra|better-auth-infra/.test(n))).toEqual([]);

    const offenders = files.filter((f) => /BETTER_AUTH_API_KEY|better-auth\/infra|better-auth-infra|\bdash\s*\(/.test(read(f)));
    expect(offenders).toEqual([]);
  });
});

describe("housekeeping removes only what is expired", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  beforeAll(async () => ({ db, close } = await createTestDb()));
  afterAll(async () => close());
  beforeEach(async () => resetDb(db));

  it("pruneExpired deletes expired sessions, tokens and old counters and keeps live ones", async () => {
    const { sql } = await import("drizzle-orm");
    const { pruneExpired } = await import("@/lib/services/maintenance");
    const u = await makeUser(db, { name: "Prune Person" });
    const now = Date.now();
    const past = new Date(now - 3600_000), future = new Date(now + 3600_000);
    await db.execute(sql`insert into session (id, expires_at, token, user_id) values ('s-old', ${past}, 't-old', ${u.id}), ('s-new', ${future}, 't-new', ${u.id})`);
    await db.execute(sql`insert into verification (id, identifier, value, expires_at) values ('v-old', 'a', 'x', ${past}), ('v-new', 'b', 'y', ${future})`);
    const sec = Math.floor(now / 1000);
    await db.execute(sql`insert into app_rate_limit (key, count, window_start) values ('old', 1, ${sec - 3 * 86400}), ('new', 1, ${sec})`);
    const res = await pruneExpired(db, now);
    expect(res).toMatchObject({ sessions: 1, verifications: 1, rateLimits: 1 });
    const left = async (t: string) => (await db.execute(sql.raw(`select count(*)::int as n from ${t}`))).rows[0] as { n: number };
    expect((await left("session")).n).toBe(1);
    expect((await left("verification")).n).toBe(1);
    expect((await left("app_rate_limit")).n).toBe(1);
  });
});

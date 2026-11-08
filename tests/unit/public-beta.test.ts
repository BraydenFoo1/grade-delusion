// The public beta must be fail-closed: no accounts, no participation, no database, whatever a caller sends.
import { afterEach, describe, expect, it, vi } from "vitest";

// If anything in beta mode touches request headers or the database, these throw and the test fails.
vi.mock("next/headers", () => ({
  headers: () => {
    throw new Error("request headers were touched in public beta mode");
  },
  cookies: () => {
    throw new Error("cookies were touched in public beta mode");
  },
}));
vi.mock("@/lib/db/client", () => ({
  getDb: () => {
    throw new Error("the database was touched in public beta mode");
  },
}));

import { BETA_POSTS, BETA_PROFILES } from "@/lib/beta/content";
import { run } from "@/lib/actions/run";
import { getActor, requireActor } from "@/lib/auth/session";
import { isPublicBeta } from "@/lib/platform/mode";
import { legal } from "@/lib/site";
import { publicAnnouncement, publicComments, publicFeed, publicPost, publicProfile, staticFeed, type BetaSource } from "@/lib/services/public-read";
import { REACTIONS, type ReactionKey } from "@/lib/platform/constants";
import type { PostView } from "@/lib/services/posts";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const ENV_KEYS = ["NODE_ENV", "GD_LOCAL", "VERCEL", "VERCEL_ENV", "BETTER_AUTH_URL", "GD_RELEASE_MODE", "GD_PUBLIC_BETA", "GD_FULL_PLATFORM", "PUBLIC_BETA", "RELEASE_MODE"];
function env(vars: Record<string, string>) {
  for (const k of ENV_KEYS) vi.stubEnv(k, "");
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
}
const deployed = () => env({ NODE_ENV: "production" });

describe("isPublicBeta: which builds are the public beta", () => {
  it("every deployed build is the public beta (production, preview, self-hosted)", () => {
    env({ NODE_ENV: "production" });
    expect(isPublicBeta()).toBe(true);
    env({ NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "production" });
    expect(isPublicBeta()).toBe(true);
    env({ NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "preview" });
    expect(isPublicBeta()).toBe(true);
  });

  it("the full platform exists only in dev, tests and the local end-to-end build", () => {
    env({ NODE_ENV: "development" });
    expect(isPublicBeta()).toBe(false);
    env({ NODE_ENV: "test" });
    expect(isPublicBeta()).toBe(false);
    env({ NODE_ENV: "production", GD_LOCAL: "1", BETTER_AUTH_URL: "http://localhost:3100" });
    expect(isPublicBeta()).toBe(false);
    env({ NODE_ENV: "production", GD_LOCAL: "1", BETTER_AUTH_URL: "http://127.0.0.1:3100" });
    expect(isPublicBeta()).toBe(false);
  });

  it("GD_LOCAL cannot open the platform on Vercel, without a loopback URL, or on a real domain", () => {
    env({ NODE_ENV: "production", GD_LOCAL: "1", VERCEL: "1", BETTER_AUTH_URL: "http://localhost:3100" });
    expect(isPublicBeta()).toBe(true);
    env({ NODE_ENV: "production", GD_LOCAL: "1" });
    expect(isPublicBeta()).toBe(true);
    env({ NODE_ENV: "production", GD_LOCAL: "1", BETTER_AUTH_URL: "https://grade-delusion.vercel.app" });
    expect(isPublicBeta()).toBe(true);
    env({ NODE_ENV: "production", GD_LOCAL: "1", BETTER_AUTH_URL: "http://localhost.evil.example" });
    expect(isPublicBeta()).toBe(true);
    env({ NODE_ENV: "production", GD_LOCAL: "1", BETTER_AUTH_URL: "not a url" });
    expect(isPublicBeta()).toBe(true);
  });

  it("no environment variable switches a deployed build to the full platform", () => {
    for (const name of ["GD_RELEASE_MODE", "GD_PUBLIC_BETA", "GD_FULL_PLATFORM", "PUBLIC_BETA", "RELEASE_MODE"]) {
      for (const value of ["full", "0", "false", "off", "1", "true", "staging", "development"]) {
        env({ NODE_ENV: "production", [name]: value });
        expect(isPublicBeta(), `${name}=${value}`).toBe(true);
      }
    }
  });
});

describe("server actions are refused in the public beta", () => {
  it("run() refuses at every level without running the body", async () => {
    deployed();
    for (const level of ["user", "participant", "staff", "admin"] as const) {
      const body = vi.fn(async () => "ran");
      const res = await run(level, body);
      expect(res.ok).toBe(false);
      expect(res.ok === false && res.error.code).toBe("UNAVAILABLE");
      expect(body).not.toHaveBeenCalled();
    }
  });

  it("EVERY exported server action (enumerated from the source) refuses a direct call", async () => {
    deployed();
    const modules = [await import("@/app/actions/account"), await import("@/app/actions/community"), await import("@/app/actions/admin")];
    const actions = modules.flatMap((m) => Object.entries(m).filter(([, v]) => typeof v === "function"));
    expect(actions.length).toBeGreaterThanOrEqual(15); // account 2 + community 9 + admin 7 at the time of writing
    for (const [name, fn] of actions) {
      const res = (await (fn as (...a: unknown[]) => Promise<{ ok: boolean; error?: { code: string } }>)({}, {})) as { ok: boolean; error?: { code: string } };
      expect(res.ok, name).toBe(false);
      expect(res.error?.code, name).toBe("UNAVAILABLE");
    }
  });

  it("and they still work in the full platform (dev/tests), proving the gate is the only reason they refuse", async () => {
    env({ NODE_ENV: "test" });
    const res = await run("user", async () => "ran").catch(() => null);
    // outside the beta run() proceeds to authentication: with the mocked headers() this fails inside, not as UNAVAILABLE
    expect(res === null || res.ok === false).toBe(true);
    if (res && res.ok === false) expect(res.error.code).not.toBe("UNAVAILABLE");
  });
});

describe("HTTP endpoints are off in the public beta", () => {
  it("the whole Better Auth API returns 404 (GET and POST), before any auth setup", async () => {
    deployed();
    const route = await import("@/app/api/auth/[...all]/route");
    for (const path of ["/api/auth/ok", "/api/auth/get-session", "/api/auth/sign-in/email", "/api/auth/delete-user", "/api/auth/request-password-reset"]) {
      expect((await route.GET(new Request(`http://x${path}`))).status, `GET ${path}`).toBe(404);
      expect((await route.POST(new Request(`http://x${path}`, { method: "POST", body: "{}" }))).status, `POST ${path}`).toBe(404);
    }
  });

  it("/api/notifications/unread returns 404", async () => {
    deployed();
    const route = await import("@/app/api/notifications/unread/route");
    expect((await route.GET()).status).toBe(404);
  });

  it("GET /api/community/posts serves the static feed without touching the database", async () => {
    deployed();
    const route = await import("@/app/api/community/posts/route");
    const res = await route.GET(new Request("http://x/api/community/posts?category=all&sort=new&page=1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [], total: 0, page: 1, pageCount: 1 });
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const bad = await route.GET(new Request("http://x/api/community/posts?page=-5&category=nope"));
    expect(bad.status).toBe(400);
  });
});

describe("no sessions and no database work in the public beta", () => {
  it("getActor() is null and never touches headers or the database", async () => {
    deployed();
    await expect(getActor()).resolves.toBeNull();
  });

  it("requireActor() is not-found (no redirect to a sign-in page that does not exist)", async () => {
    deployed();
    await expect(requireActor("/dashboard")).rejects.toMatchObject({ digest: expect.stringContaining("404") });
  });

  it("the public read model never touches the database", async () => {
    deployed();
    const q = { category: "all", sort: "new", page: 1 } as const;
    await expect(publicFeed(q)).resolves.toEqual({ items: [], total: 0, page: 1, pageCount: 1 });
    await expect(publicPost("00000000-0000-4000-8000-000000000000")).resolves.toBeNull();
    await expect(publicComments("00000000-0000-4000-8000-000000000000")).resolves.toEqual([]);
    await expect(publicProfile("anyone")).resolves.toBeNull();
    await expect(publicAnnouncement()).resolves.toBe("");
  });
});

describe("static beta content", () => {
  it("ships empty: the community page shows 'Community is opening soon'", () => {
    expect(BETA_POSTS).toHaveLength(0);
    expect(BETA_PROFILES).toHaveLength(0);
  });

  const mk = (over: Partial<PostView> & { id: string }): PostView => ({
    body: "I will start revising tomorrow.",
    category: "exams",
    status: "approved",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    publishedAt: new Date("2026-01-02T00:00:00Z"),
    editedAt: null,
    author: { id: "team", name: "Grade Delusion Team" },
    reactions: Object.fromEntries(REACTIONS.map((r) => [r.key, 0])) as Record<ReactionKey, number>,
    myReaction: REACTIONS[0]!.key,
    commentCount: 0,
    ...over,
  });
  const source = (posts: PostView[]): BetaSource => ({ posts, profiles: [], announcement: "" });
  const q = (o: object = {}) => ({ category: "all", sort: "new", page: 1, ...o }) as Parameters<typeof staticFeed>[0];

  it("only approved posts are visible, and nobody's own reaction leaks through", () => {
    const s = source([mk({ id: "a" }), mk({ id: "b", status: "pending" }), mk({ id: "c", status: "rejected" }), mk({ id: "d", status: "removed" })]);
    const res = staticFeed(q(), s);
    expect(res.items.map((p) => p.id)).toEqual(["a"]);
    expect(res.items[0]!.myReaction).toBeNull();
    expect(res.total).toBe(1);
  });

  it("filters by category, text and author; sorts newest first; pages", () => {
    const posts = Array.from({ length: 25 }, (_, i) => mk({ id: `p${i}`, body: i % 2 ? "even more delusion" : "odd one", category: i % 3 ? "exams" : "studying", publishedAt: new Date(2026, 0, i + 1) }));
    const s = source(posts);
    expect(staticFeed(q({ q: "EVEN" }), s).items.every((p) => p.body.includes("even"))).toBe(true);
    expect(staticFeed(q({ category: "studying" }), s).items.every((p) => p.category === "studying")).toBe(true);
    expect(staticFeed(q(), s, "nobody").total).toBe(0);
    const first = staticFeed(q(), s);
    expect(first.items[0]!.id).toBe("p24");
    expect(first.pageCount).toBeGreaterThan(1);
    expect(staticFeed(q({ page: 999 }), s).page).toBe(first.pageCount);
  });
});

describe("legal wording stays unpublished until reviewed", () => {
  it("the draft beta wording flag is pinned to false (flip it only after legal review, then update this test)", () => {
    expect(legal.betaWordingApproved).toBe(false);
  });
});

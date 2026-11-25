// The public beta has ended: the full community platform is the release mode everywhere. These tests pin that, and keep
// covering the static read model and the draft-legal-wording flag.
import { afterEach, describe, expect, it, vi } from "vitest";

import { BETA_POSTS, BETA_PROFILES } from "@/lib/beta/content";
import { isPublicBeta } from "@/lib/platform/mode";
import { legal } from "@/lib/site";
import { staticFeed, type BetaSource } from "@/lib/services/public-read";
import { REACTIONS, type ReactionKey } from "@/lib/platform/constants";
import type { PostView } from "@/lib/services/posts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("release mode: the full platform everywhere", () => {
  it("isPublicBeta() is false in every environment, so registration and participation are never gated by the build", () => {
    for (const env of [
      { NODE_ENV: "production" },
      { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "production" },
      { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "preview" },
      { NODE_ENV: "development" },
      { NODE_ENV: "test" },
      { NODE_ENV: "production", GD_LOCAL: "1", BETTER_AUTH_URL: "http://localhost:3100" },
    ]) {
      for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
      expect(isPublicBeta(), JSON.stringify(env)).toBe(false);
      vi.unstubAllEnvs();
    }
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

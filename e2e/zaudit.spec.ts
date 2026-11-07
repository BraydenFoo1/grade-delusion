// AUDIT (runs last): adversarial and measurement tests against the real production build.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type BrowserContext, type Page, type Request } from "@playwright/test";
import { E2E_BASE_URL } from "./constants";
import { authState, registerAndVerify, uniqueText } from "./helpers";

test.describe.configure({ mode: "serial" });

type Who = "admin" | "mod" | "fan";
const asUser = async (browser: Browser, who: Who, viewport = { width: 1280, height: 900 }) => {
  const context = await browser.newContext({ storageState: authState(who), baseURL: E2E_BASE_URL, viewport });
  return { context, page: await context.newPage() };
};
const anon = async (browser: Browser, viewport = { width: 1280, height: 900 }) => {
  const context = await browser.newContext({ baseURL: E2E_BASE_URL, viewport });
  return { context, page: await context.newPage() };
};

/* ---------------------------------------------------------------------------------------------- */
/* Server actions are public HTTP endpoints: capture a real one, replay it as the wrong person.   */
/* ---------------------------------------------------------------------------------------------- */

type Captured = { url: string; headers: Record<string, string>; body: string };

async function capture(page: Page, trigger: () => Promise<unknown>): Promise<Captured> {
  const [req] = await Promise.all([page.waitForRequest((r: Request) => r.method() === "POST" && "next-action" in r.headers()), trigger()]);
  const h = req.headers();
  const keep = ["next-action", "content-type", "accept", "next-router-state-tree"];
  return { url: req.url(), headers: Object.fromEntries(keep.filter((k) => h[k] !== undefined).map((k) => [k, h[k]])), body: req.postData() ?? "" };
}

async function replay(context: BrowserContext, cap: Captured, opts: { body?: string; origin?: string | null } = {}) {
  const headers = { ...cap.headers };
  if (opts.origin !== null) Object.assign(headers, { origin: opts.origin ?? E2E_BASE_URL });
  const res = await context.request.post(cap.url, { headers, data: opts.body ?? cap.body, failOnStatusCode: false });
  const text = await res.text();
  return { status: res.status(), text, ok: !text.includes('"ok":false') && res.status() < 400, code: text.match(/"code":"([A-Z_]+)"/)?.[1] };
}

async function postStatus(browser: Browser, who: Who, text: string): Promise<string> {
  const { context, page } = await asUser(browser, who);
  await page.goto("/my-submissions");
  const card = page.getByRole("listitem").filter({ hasText: text });
  const status = (await card.count()) ? ((await card.first().locator(".pf-badge").first().textContent()) ?? "").trim() : "none";
  await context.close();
  return status;
}

test.describe("server actions replayed by the wrong person", () => {
  const pending = uniqueText("Audit pending");

  test("a member (or anonymous visitor, or a foreign origin) can't approve a post by replaying the moderator's request", async ({ browser }) => {
    const fan = await asUser(browser, "fan");
    await fan.page.goto("/submit");
    await fan.page.getByLabel("Your delusion").fill(pending);
    await fan.page.getByRole("button", { name: "Send for review" }).click();
    await expect(fan.page.getByText("Sent for review.")).toBeVisible();

    const mod = await asUser(browser, "mod");
    await mod.page.goto("/admin/queue");
    const card = mod.page.getByRole("listitem").filter({ hasText: pending });
    await expect(card).toBeVisible();
    const cap = await capture(mod.page, () => card.getByRole("button", { name: "Approve", exact: true }).click());
    // that click approved it; send it back to review so we can attack it
    await expect(card.getByText("Approved.")).toBeVisible();
    const id = JSON.parse(cap.body)[0].id as string;
    // (re-pend it through the author's own edit, which is a legitimate path)
    await fan.page.goto(`/my-submissions/${id}/edit`);
    await fan.page.getByLabel("Your delusion").fill(`${pending} (edited)`);
    await fan.page.getByRole("button", { name: "Save and resubmit" }).click();
    await expect(fan.page).toHaveURL(/saved=1/);
    expect(await postStatus(browser, "fan", `${pending} (edited)`)).toBe("In review");

    // attack 1: a signed-in MEMBER replays the moderator's request
    const asFan = await replay(fan.context, cap);
    expect(asFan.code, asFan.text).toBe("FORBIDDEN");
    expect(await postStatus(browser, "fan", `${pending} (edited)`)).toBe("In review");

    // attack 2: an anonymous visitor
    const visitor = await anon(browser);
    const asAnon = await replay(visitor.context, cap);
    expect(asAnon.code, asAnon.text).toBe("UNAUTHENTICATED");
    await visitor.context.close();

    // attack 3: the moderator's own cookies, but from another origin (CSRF). Next's origin check must refuse it.
    const csrf = await replay(mod.context, cap, { origin: "https://evil.example" });
    expect(csrf.ok, csrf.text.slice(0, 200)).toBe(false);
    expect(await postStatus(browser, "fan", `${pending} (edited)`)).toBe("In review");

    // the old request carries the version the moderator saw, which the author has since edited: refused
    const stale = await replay(mod.context, cap);
    expect(stale.code, stale.text).toBe("CONFLICT");
    expect(await postStatus(browser, "fan", `${pending} (edited)`)).toBe("In review");

    // control: the moderator, from the right origin, reviewing the NEW version, IS allowed
    await mod.page.goto("/admin/queue");
    const card2 = mod.page.getByRole("listitem").filter({ hasText: `${pending} (edited)` });
    await card2.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(card2.getByText("Approved.")).toBeVisible();
    expect(await postStatus(browser, "fan", `${pending} (edited)`)).toBe("Live");
    await fan.context.close();
    await mod.context.close();
  });

  test("a member can't change anyone's role (or their own) by replaying the admin's request", async ({ browser, request }) => {
    const throwaway = await anon(browser);
    const email = `escalate-${Date.now()}@e2e.test`;
    await registerAndVerify(throwaway.page, "Eve Escalator", email);
    await throwaway.context.close();
    const feed = await (await request.get("/api/community/posts")).json();
    const fanId = feed.items[0].author.id as string;

    const admin = await asUser(browser, "admin");
    await admin.page.goto("/admin/users?q=Eve+Escalator");
    await admin.page.getByRole("link", { name: "Eve Escalator" }).click();
    await expect(admin.page).toHaveURL(/\/admin\/users\/[A-Za-z0-9_-]+$/);
    await admin.page.getByRole("combobox", { name: "Role" }).selectOption("moderator");
    const cap = await capture(admin.page, () => admin.page.getByRole("button", { name: "Save role" }).click());
    await expect(admin.page.getByText("Role updated.")).toBeVisible();
    const body = JSON.parse(cap.body) as [{ userId: string; role: string }];
    expect(body[0].role).toBe("moderator");

    const fan = await asUser(browser, "fan");
    for (const [label, who] of [["fan", fan], ["mod", await asUser(browser, "mod")]] as const) {
      // escalate the member to admin
      const res = await replay(who.context, cap, { body: JSON.stringify([{ userId: fanId, role: "admin" }]) });
      expect(res.code, `${label}: ${res.text}`).toBe("FORBIDDEN");
    }
    // and the fan is still an ordinary member
    expect((await fan.page.goto("/admin"))?.status()).toBe(404);
    await fan.context.close();
    await admin.context.close();
  });

  test("a member can't delete someone else's post (IDOR) by replaying their own delete request with another id", async ({ browser, request }) => {
    const feed = await (await request.get("/api/community/posts")).json();
    const victimPost = feed.items.find((p: { author: { name: string } }) => p.author.name === "Fiona Fan") as { id: string; body: string };

    const iris = await anon(browser);
    await registerAndVerify(iris.page, "Iris Intruder", `iris-${Date.now()}@e2e.test`);
    const mine = uniqueText("Iris draft");
    await iris.page.goto("/submit");
    await iris.page.getByLabel("Your delusion").fill(mine);
    await iris.page.getByRole("button", { name: "Send for review" }).click();
    await expect(iris.page.getByText("Sent for review.")).toBeVisible();
    await iris.page.goto("/my-submissions");
    await iris.page.getByRole("listitem").filter({ hasText: mine }).getByRole("button", { name: "Delete" }).click();
    const cap = await capture(iris.page, () => iris.page.getByRole("button", { name: "Delete", exact: true }).last().click());

    const res = await replay(iris.context, cap, { body: JSON.stringify([victimPost.id]) });
    expect(res.code, res.text).toBe("NOT_FOUND");
    // garbage ids are a clean error, not a crash
    for (const bad of ['["not-a-uuid"]', "[null]", "[12345]", '[{"$ne":1}]', '["\\u0000"]']) {
      const r = await replay(iris.context, cap, { body: bad });
      expect(r.status, `${bad}: ${r.text.slice(0, 160)}`).toBeLessThan(500);
    }
    await iris.context.close();
    const still = await (await request.get(`/api/community/posts?q=${encodeURIComponent(victimPost.body.slice(0, 30))}`)).json();
    expect(still.total).toBeGreaterThan(0); // the victim's post is untouched
  });

  test("a hostile oversized body is refused without taking the server down", async ({ browser, request }) => {
    const mod = await asUser(browser, "mod");
    await mod.page.goto("/admin/posts");
    // any captured action will do: use the first Remove on a live post
    const cap = await capture(mod.page, async () => {
      await mod.page.getByRole("button", { name: "Remove" }).first().click();
      await mod.page.getByRole("button", { name: "Remove post" }).click();
    });
    const huge = await replay(mod.context, cap, { body: JSON.stringify([{ id: "x".repeat(5_000_000) }]) });
    expect(huge.ok).toBe(false);
    expect((await request.get("/api/auth/ok")).status()).toBe(200); // still alive
    await mod.context.close();
  });
});

/* ---------------------------------------------------------------------------------------------- */

test.describe("hostile URLs and parameters never produce a server error", () => {
  const URLS = [
    "/u/%00",
    "/u/..%2f..%2fetc%2fpasswd",
    "/u/<script>",
    "/community/%00",
    "/community/not-a-uuid",
    "/community?page=99999999999999999999",
    "/community?page=-5&q=%00",
    "/community?page=1e99&category=%00&sort=%00",
    "/community?q=" + "a".repeat(5000),
    "/notifications?page=-5",
    "/notifications?page=99999999999999999999",
    "/my-submissions?status=%00&page=NaN",
    "/admin/audit?page=1e99&action=%00",
    "/admin/users?q=%00&role=%00&state=%00",
    "/admin/users/%00",
    "/admin/reports?status=%00&page=-1",
    "/admin/posts?status=drop%20table&q=%25",
  ];
  test("anonymous, member and admin all get a clean 2xx/3xx/4xx", async ({ browser }) => {
    for (const who of ["anon", "fan", "admin"] as const) {
      const { context, page } = who === "anon" ? await anon(browser) : await asUser(browser, who);
      for (const url of URLS) {
        const res = await page.goto(url);
        expect(res?.status(), `${who} ${url}`).toBeLessThan(500);
      }
      await context.close();
    }
  });
});

test.describe("reflected input", () => {
  test("a hostile search query is shown as text and executes nothing", async ({ browser }) => {
    const { context, page } = await anon(browser);
    const dialogs: string[] = [];
    page.on("dialog", (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    const payload = `"><img src=x onerror=alert(1)><script>alert(2)</script>`;
    await page.goto(`/community?q=${encodeURIComponent(payload)}`);
    await expect(page.locator("img[src='x']")).toHaveCount(0);
    await expect(page.getByLabel("Search delusions and names")).toHaveValue(payload);
    await expect(page.locator("main script")).toHaveCount(0);
    expect(dialogs).toEqual([]);
    await context.close();
  });
});

test.describe("rate limiting is enforced over HTTP", () => {
  test("the public feed API starts answering 429 with Retry-After once a single IP exceeds its allowance", async ({ request }) => {
    const headers = { "x-forwarded-for": "198.51.100.77" };
    let limited: Awaited<ReturnType<typeof request.get>> | null = null;
    for (let i = 0; i < 130 && !limited; i++) {
      const res = await request.get("/api/community/posts", { headers });
      if (res.status() === 429) limited = res;
    }
    expect(limited, "never rate limited after 130 requests").not.toBeNull();
    expect(Number(limited!.headers()["retry-after"])).toBeGreaterThan(0);
    expect(((await limited!.json()) as { error: { code: string } }).error.code).toBe("RATE_LIMITED");
    // a different IP is unaffected
    expect((await request.get("/api/community/posts", { headers: { "x-forwarded-for": "198.51.100.78" } })).status()).toBe(200);
  });
});

test.describe("indexing and metadata", () => {
  test("private areas send noindex on every route, and every platform page has its own title", async ({ browser, request }) => {
    for (const path of ["/admin", "/admin/queue", "/dashboard", "/settings", "/sign-in"]) {
      expect((await request.get(path)).headers()["x-robots-tag"], path).toContain("noindex");
    }
    const titles = new Map<string, string>();
    const check = async (page: Page, path: string) => {
      await page.goto(path);
      const title = await page.title();
      expect(title.length, path).toBeGreaterThan(3);
      expect(title, path).toContain("Grade Delusion");
      expect(titles.get(title), `duplicate title "${title}" on ${path} and ${titles.get(title)}`).toBeUndefined();
      titles.set(title, path);
      expect(await page.locator("html").getAttribute("lang")).toBe("en");
      expect(await page.locator("h1").count(), `${path} h1 count`).toBe(1);
    };
    // signed-out pages are checked signed out (signed in, /sign-in just redirects to the dashboard)
    const visitor = await anon(browser);
    for (const path of ["/community", "/sign-in", "/sign-up", "/forgot-password", "/check-email"]) await check(visitor.page, path);
    await visitor.context.close();
    const admin = await asUser(browser, "admin");
    for (const path of ["/dashboard", "/submit", "/my-submissions", "/notifications", "/activity", "/settings", "/admin", "/admin/queue", "/admin/reports", "/admin/posts", "/admin/comments", "/admin/users", "/admin/moderators", "/admin/audit", "/admin/settings"]) await check(admin.page, path);
    await admin.context.close();
  });
});

/* ---------------------------------------------------------------------------------------------- */

const ALL_PAGES: { who: Who | "anon"; path: string }[] = [
  { who: "anon", path: "/community" },
  { who: "anon", path: "/sign-in" },
  { who: "anon", path: "/sign-up" },
  { who: "fan", path: "/dashboard" },
  { who: "fan", path: "/submit" },
  { who: "fan", path: "/my-submissions" },
  { who: "fan", path: "/settings" },
  { who: "admin", path: "/admin" },
  { who: "admin", path: "/admin/queue" },
  { who: "admin", path: "/admin/reports" },
  { who: "admin", path: "/admin/posts" },
  { who: "admin", path: "/admin/users" },
  { who: "admin", path: "/admin/audit" },
  { who: "admin", path: "/admin/settings" },
];
const open = (browser: Browser, who: Who | "anon", viewport: { width: number; height: number }) => (who === "anon" ? anon(browser, viewport) : asUser(browser, who, viewport));

test.describe("responsive reflow (WCAG 1.4.10) at 320px and 200% zoom equivalents", () => {
  for (const width of [320, 280]) {
    test(`no horizontal page scrolling at ${width}px`, async ({ browser }) => {
      for (const p of ALL_PAGES) {
        const { context, page } = await open(browser, p.who, { width, height: 700 });
        await page.goto(p.path);
        await page.waitForLoadState("networkidle");
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(over, `${p.path} overflows by ${over}px at ${width}px`).toBeLessThanOrEqual(0);
        await context.close();
      }
    });
  }
});

test.describe("accessibility: best practices and interactive states", () => {
  const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
  const scan = async (page: Page, label: string) => {
    const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const v = r.violations.map((x) => `${x.id} (${x.impact}): ${x.help} → ${x.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`);
    expect(v, `${label}\n${v.join("\n")}`).toEqual([]);
  };

  test("every page, including best-practice rules (landmarks, headings, regions)", async ({ browser }) => {
    for (const p of ALL_PAGES) {
      const { context, page } = await open(browser, p.who, { width: 1280, height: 900 });
      await page.goto(p.path);
      await page.waitForLoadState("networkidle");
      await scan(page, p.path);
      await context.close();
    }
  });

  test("with panels open and validation errors showing", async ({ browser }) => {
    // report panel (member on a live post)
    const fan = await asUser(browser, "mod");
    await fan.page.goto("/community");
    await fan.page.getByRole("link", { name: /comment/ }).first().click();
    await fan.page.getByRole("button", { name: "Report" }).first().click();
    await expect(fan.page.getByRole("button", { name: "Send report" })).toBeVisible();
    await scan(fan.page, "report panel open");
    await fan.page.getByRole("button", { name: "Send report" }).click(); // no reason chosen: inline error path
    await scan(fan.page, "report panel after submit without a reason");
    await fan.context.close();

    // settings: invalid profile name error + delete-account confirmation
    const member = await asUser(browser, "fan");
    await member.page.goto("/settings");
    await member.page.getByLabel("Display name").fill("Site Admin");
    await member.page.getByRole("button", { name: "Save profile" }).click();
    await expect(member.page.getByText("That name is reserved.").first()).toBeVisible();
    await scan(member.page, "settings with a field error");
    await member.page.getByRole("button", { name: "Delete my account…" }).click();
    await scan(member.page, "delete-account confirmation open");
    await member.context.close();

    // sign-up with errors
    const v = await anon(browser);
    await v.page.goto("/sign-up");
    await v.page.getByLabel("Display name").fill("x");
    await v.page.getByLabel("E-mail").fill("not-an-email");
    await v.page.getByLabel("Password", { exact: true }).fill("short");
    await v.page.getByRole("button", { name: "Create account" }).click();
    await scan(v.page, "sign-up with browser validation showing");
    await v.context.close();

    // review desk with the reject panel open (needs a pending post)
    const author = await asUser(browser, "fan");
    await author.page.goto("/submit");
    await author.page.getByLabel("Your delusion").fill(uniqueText("Reject-panel scan"));
    await author.page.getByRole("button", { name: "Send for review" }).click();
    await expect(author.page.getByText("Sent for review.")).toBeVisible();
    await author.context.close();
    const mod = await asUser(browser, "mod");
    await mod.page.goto("/admin/queue");
    await mod.page.getByRole("button", { name: "Not approved…" }).first().click();
    await scan(mod.page, "review desk, reject panel open");
    await mod.context.close();

    // admin chart table view, and a suspended user's page
    const admin = await asUser(browser, "admin");
    await admin.page.goto("/admin");
    await admin.page.getByText("View as table").click();
    await scan(admin.page, "overview with the chart table open");
    await admin.context.close();
  });

  test("keyboard: every stop in the tab order shows a visible focus indicator", async ({ browser }) => {
    for (const path of ["/community", "/sign-in", "/sign-up"]) {
      const { context, page } = await anon(browser);
      await page.goto(path);
      const missing: string[] = [];
      for (let i = 0; i < 45; i++) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const ring = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2;
          // visually-hidden radios/checkboxes draw their ring on the wrapping label (has-[:focus-visible])
          const wrapped = el.matches("input.sr-only") && !!el.closest("label");
          return { tag: `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}`, text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30), ring: ring || wrapped };
        });
        if (info && !info.ring) missing.push(`${info.tag} "${info.text}"`);
      }
      expect(missing, `${path}: focus indicator missing on\n${missing.join("\n")}`).toEqual([]);
      await context.close();
    }
  });

  test("reduced motion: nothing animates or transitions for users who ask for none", async ({ browser }) => {
    const context = await browser.newContext({ baseURL: E2E_BASE_URL, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/community");
    const longest = await page.evaluate(() => Math.max(...Array.from(document.querySelectorAll("*")).map((el) => Math.max(parseFloat(getComputedStyle(el).transitionDuration) || 0, parseFloat(getComputedStyle(el).animationDuration) || 0))));
    expect(longest).toBeLessThanOrEqual(0.001);
    await context.close();
  });
});

/* ---------------------------------------------------------------------------------------------- */

test.describe("performance (measured in Chrome against the production build)", () => {
  async function vitals(page: Page) {
    return page.evaluate(
      () =>
        new Promise<{ lcp: number; cls: number; fcp: number; ttfb: number; jsKB: number; requests: number }>((resolve) => {
          let lcp = 0;
          let cls = 0;
          new PerformanceObserver((l) => l.getEntries().forEach((e) => (lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((l) => l.getEntries().forEach((e) => !(e as unknown as { hadRecentInput: boolean }).hadRecentInput && (cls += (e as unknown as { value: number }).value))).observe({ type: "layout-shift", buffered: true });
          setTimeout(() => {
            const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
            const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
            const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0;
            resolve({ lcp, cls, fcp, ttfb: nav.responseStart, jsKB: Math.round(res.filter((r) => r.initiatorType === "script" || r.name.endsWith(".js")).reduce((a, r) => a + (r.encodedBodySize || 0), 0) / 1024), requests: res.length });
          }, 1500);
        }),
    );
  }

  for (const p of [
    { who: "anon" as const, path: "/", budgetJS: 330 },
    { who: "anon" as const, path: "/community", budgetJS: 200 },
    { who: "anon" as const, path: "/sign-in", budgetJS: 200 },
    { who: "fan" as const, path: "/dashboard", budgetJS: 200 },
    { who: "admin" as const, path: "/admin", budgetJS: 200 },
  ]) {
    test(`${p.path}: LCP, layout shift, JS weight`, async ({ browser }) => {
      const { context, page } = await open(browser, p.who, { width: 1280, height: 800 });
      await page.goto(p.path, { waitUntil: "load" });
      const v = await vitals(page);
      console.log(`PERF ${p.who.padEnd(5)} ${p.path.padEnd(11)} TTFB ${v.ttfb.toFixed(0)}ms  FCP ${v.fcp.toFixed(0)}ms  LCP ${v.lcp.toFixed(0)}ms  CLS ${v.cls.toFixed(3)}  JS ${v.jsKB}KB (compressed-on-wire)  requests ${v.requests}`);
      expect(v.cls, "cumulative layout shift").toBeLessThan(0.1);
      expect(v.lcp, "largest contentful paint (localhost)").toBeLessThan(2500);
      expect(v.ttfb, "time to first byte (localhost)").toBeLessThan(800);
      expect(v.jsKB, "JavaScript transferred").toBeLessThan(p.budgetJS);
      await context.close();
    });
  }
});

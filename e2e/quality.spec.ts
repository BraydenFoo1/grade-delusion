import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_BASE_URL, E2E_SHOTS } from "./constants";
import { authState } from "./helpers";

mkdirSync(path.resolve(process.cwd(), E2E_SHOTS), { recursive: true });

type Who = "anon" | "fan" | "mod" | "admin";
async function open(browser: Browser, who: Who, viewport = { width: 1280, height: 900 }, colorScheme: "light" | "dark" = "light") {
  const context = await browser.newContext({
    baseURL: E2E_BASE_URL,
    viewport,
    colorScheme,
    ...(who === "anon" ? {} : { storageState: authState(who) }),
  });
  return { context, page: await context.newPage() };
}

const PAGES: { who: Who; path: string; name: string }[] = [
  { who: "anon", path: "/community", name: "community" },
  { who: "anon", path: "/sign-in", name: "sign-in" },
  { who: "anon", path: "/sign-up", name: "sign-up" },
  { who: "anon", path: "/forgot-password", name: "forgot-password" },
  { who: "anon", path: "/check-email", name: "check-email" },
  { who: "fan", path: "/dashboard", name: "dashboard" },
  { who: "fan", path: "/submit", name: "submit" },
  { who: "fan", path: "/my-submissions", name: "my-submissions" },
  { who: "fan", path: "/notifications", name: "notifications" },
  { who: "fan", path: "/activity", name: "activity" },
  { who: "fan", path: "/settings", name: "settings" },
  { who: "mod", path: "/admin/queue", name: "admin-queue" },
  { who: "mod", path: "/admin/reports", name: "admin-reports" },
  { who: "admin", path: "/admin", name: "admin-overview" },
  { who: "admin", path: "/admin/posts", name: "admin-posts" },
  { who: "admin", path: "/admin/comments", name: "admin-comments" },
  { who: "admin", path: "/admin/users", name: "admin-users" },
  { who: "admin", path: "/admin/moderators", name: "admin-moderators" },
  { who: "admin", path: "/admin/audit", name: "admin-audit" },
  { who: "admin", path: "/admin/settings", name: "admin-settings" },
];

async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n    ")}`);
}

test.describe("accessibility (axe, WCAG 2.2 AA) in light and dark", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const p of PAGES) {
      test(`${p.name} (${scheme})`, async ({ browser }) => {
        const { context, page } = await open(browser, p.who, undefined, scheme);
        const res = await page.goto(p.path);
        expect(res?.status()).toBe(200);
        await page.waitForLoadState("networkidle");
        const violations = await axeViolations(page);
        expect(violations, violations.join("\n")).toEqual([]);
        await context.close();
      });
    }
  }

  test("a post page with comments, and the user detail page", async ({ browser, request }) => {
    const feed = await (await request.get("/api/community/posts")).json();
    const { context, page } = await open(browser, "admin");
    for (const target of [`/community/${feed.items[0].id}`, `/u/${feed.items[0].author.id}`, `/admin/users/${feed.items[0].author.id}`]) {
      await page.goto(target);
      await page.waitForLoadState("networkidle");
      const violations = await axeViolations(page);
      expect(violations, `${target}\n${violations.join("\n")}`).toEqual([]);
    }
    await context.close();
  });
});

test.describe("responsive layout", () => {
  const PHONE = { width: 390, height: 844 };
  for (const p of PAGES) {
    test(`no sideways scrolling on a phone: ${p.name}`, async ({ browser }) => {
      const { context, page } = await open(browser, p.who, PHONE);
      await page.goto(p.path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${p.path} is ${overflow}px wider than the screen`).toBeLessThanOrEqual(0);
      await context.close();
    });
  }

  test("phones get a bottom tab bar (with the primary action in the middle); desktops get a top nav", async ({ browser }) => {
    const phone = await open(browser, "fan", PHONE);
    // The first-visit cookie banner sits over the bottom tab bar until it is acknowledged; this test is about the tab bar.
    await phone.context.addInitScript(() => localStorage.setItem("gd_cookie_consent", "acknowledged"));
    await phone.page.goto("/dashboard");
    const tabs = phone.page.getByRole("navigation", { name: "Main" }).last();
    await expect(tabs).toBeVisible();
    for (const label of ["Community", "Home", "Submit", "Alerts", "Me"]) await expect(tabs.getByRole("link", { name: new RegExp(`^${label}`) })).toBeVisible();
    await tabs.getByRole("link", { name: "Submit" }).click();
    await expect(phone.page).toHaveURL(/\/submit/);
    await expect(tabs.getByRole("link", { name: "Submit" })).toHaveAttribute("aria-current", "page");
    await phone.context.close();

    const desktop = await open(browser, "fan");
    await desktop.page.goto("/dashboard");
    await expect(desktop.page.getByRole("navigation", { name: "Main" }).first().getByRole("link", { name: "Community" })).toBeVisible();
    await desktop.context.close();
  });

  test("the account menu works by keyboard and closes on Escape", async ({ browser }) => {
    const { context, page } = await open(browser, "fan");
    await page.goto("/dashboard");
    await page.locator("summary", { hasText: "Account menu for" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: "Settings" })).toBeHidden();
    await context.close();
  });
});

test.describe("theme", () => {
  test("follows the system, and the toggle overrides and remembers the choice", async ({ browser }) => {
    const { context, page } = await open(browser, "anon", undefined, "dark");
    await page.goto("/community");
    const bg = () => page.evaluate(() => getComputedStyle(document.querySelector("[data-platform]")!).backgroundColor);
    expect(await bg()).toBe("rgb(15, 14, 20)"); // dark by system preference
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    expect(await bg()).toBe("rgb(255, 253, 245)");
    await page.reload();
    expect(await bg()).toBe("rgb(255, 253, 245)"); // remembered, no flash of the other theme
    await context.close();
  });
});

test.describe("the existing marketing site is untouched", () => {
  test("home page renders, the generator works, and nothing is blocked by the new security headers", async ({ browser }) => {
    const { context, page } = await open(browser, "anon");
    const problems: string[] = [];
    page.on("console", (m) => (m.type() === "error" || /content security policy/i.test(m.text())) && problems.push(m.text()));
    page.on("pageerror", (e) => problems.push(e.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Delusion");
    await page.locator("#generator").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Give me a delusion/i }).click();
    await expect(page.getByRole("button", { name: /Give me another delusion/i })).toBeVisible({ timeout: 5000 });
    for (const p of ["/privacy", "/terms", "/blog", "/student-memes"]) expect((await page.goto(p))?.status(), p).toBe(200);
    expect(problems, problems.join("\n")).toEqual([]);
    await context.close();
  });
});

test.describe("cookie information banner", () => {
  test("one 'Got it' button; it saves only 'acknowledged' locally, sends nothing, and stays dismissed", async ({ browser }) => {
    const { context, page } = await open(browser, "anon", { width: 390, height: 844 });
    const requests: string[] = [];
    page.on("request", (r) => requests.push(`${r.method()} ${r.url()} ${r.postData() ?? ""}`));
    await page.goto("/");
    const banner = page.getByRole("region", { name: "Cookie information" });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("button")).toHaveCount(1);
    await expect(banner.getByRole("button", { name: /Got it/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Essential Only|Accept All/ })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("gd_cookie_consent"))).toBeNull();
    // Compact on a phone (it was ~200px tall stacked), with a touch target of at least 44px.
    // (The banner pops in with a scale animation, so wait until the measurement settles instead of reading it mid-animation.)
    const gotIt = banner.getByRole("button", { name: /Got it/ });
    await expect.poll(async () => (await gotIt.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expect.poll(async () => (await banner.boundingBox())?.height ?? 999).toBeLessThanOrEqual(150);
    const before = requests.length;
    await banner.getByRole("button", { name: /Got it/ }).click();
    await expect(banner).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("gd_cookie_consent"))).toBe("acknowledged");
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(["gd_cookie_consent"]);
    expect(await page.evaluate(() => document.cookie)).toBe("");
    expect(requests.slice(before).filter((r) => /consent|acknowledged/i.test(r)), "the banner must not send anything").toEqual([]);
    await page.reload();
    await page.goto("/privacy");
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Cookie information" })).toHaveCount(0);
    await context.close();
  });
});

test.describe("quiz result announcement", () => {
  test("the animated percentage is hidden from the accessibility tree; the result is announced once as static text", async ({ browser }) => {
    const { context, page } = await open(browser, "anon", { width: 390, height: 844 });
    await page.addInitScript(() => localStorage.setItem("gd_cookie_consent", "acknowledged"));
    await page.goto("/");
    await page.locator("#student-quiz").scrollIntoViewIfNeeded();
    for (let i = 0; i < 7; i++) {
      await page.locator("#student-quiz ul button").first().click();
      await page.waitForTimeout(650);
    }
    const live = page.locator('#student-quiz [aria-live="polite"]').first();
    await expect(live.getByText(/\d+ percent/)).toHaveCount(1);
    const final = (await live.getByText(/\d+ percent/).innerText()).match(/\d+/)![0];
    // Record what the live region exposes while the visible number counts up (~1.3s): the counter must not be exposed.
    const counter = live.locator("p[aria-hidden='true']").first();
    await expect(counter).toHaveCount(1);
    const snapshot = await live.ariaSnapshot();
    expect(snapshot).toContain(`${final} percent`);
    expect(snapshot).not.toMatch(new RegExp(`^\\s*- paragraph: ["']?${final}%`, "m"));
    // The visible animation still runs to the same number.
    await expect(counter).toHaveText(new RegExp(`^${final}\\s*%$`), { timeout: 5000 });
    await context.close();
  });
});

test.describe("screenshots for visual review", () => {
  const SHOTS = [
    { who: "anon" as Who, path: "/community", name: "community" },
    { who: "anon" as Who, path: "/sign-up", name: "sign-up" },
    { who: "fan" as Who, path: "/dashboard", name: "dashboard" },
    { who: "fan" as Who, path: "/submit", name: "submit" },
    { who: "mod" as Who, path: "/admin/queue", name: "admin-queue" },
    { who: "admin" as Who, path: "/admin", name: "admin-overview" },
    { who: "admin" as Who, path: "/admin/settings", name: "admin-settings" },
  ];
  for (const s of SHOTS) {
    test(`capture ${s.name}`, async ({ browser }) => {
      for (const [label, viewport, scheme] of [
        ["desktop-light", { width: 1280, height: 900 }, "light"],
        ["desktop-dark", { width: 1280, height: 900 }, "dark"],
        ["phone-light", { width: 390, height: 844 }, "light"],
      ] as const) {
        const { context, page } = await open(browser, s.who, viewport, scheme);
        await page.goto(s.path);
        await page.waitForLoadState("networkidle");
        await page.screenshot({ path: path.resolve(process.cwd(), E2E_SHOTS, `${s.name}.${label}.png`), fullPage: true });
        await context.close();
      }
    });
  }
});

import { expect, test, type Browser } from "@playwright/test";
import { E2E_BASE_URL, E2E_PASSWORD } from "./constants";
import { authState, signIn, uniqueText } from "./helpers";

async function asUser(browser: Browser, who: "admin" | "mod" | "fan") {
  const context = await browser.newContext({ storageState: authState(who), baseURL: E2E_BASE_URL });
  return { context, page: await context.newPage() };
}
async function anonymous(browser: Browser) {
  const context = await browser.newContext({ baseURL: E2E_BASE_URL });
  return { context, page: await context.newPage() };
}

const MEMBER_PAGES = ["/dashboard", "/submit", "/my-submissions", "/notifications", "/activity", "/settings"];
const STAFF_PAGES = ["/admin", "/admin/queue", "/admin/reports", "/admin/posts", "/admin/comments", "/admin/users"];
const ADMIN_ONLY_PAGES = ["/admin/moderators", "/admin/audit", "/admin/settings"];

test.describe("who can open what", () => {
  test("signed-out visitors are sent to sign in (and back afterwards)", async ({ browser }) => {
    const { context, page } = await anonymous(browser);
    for (const path of [...MEMBER_PAGES, ...STAFF_PAGES, ...ADMIN_ONLY_PAGES]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(`${E2E_BASE_URL}/sign-in?next=${encodeURIComponent(path)}`);
    }
    await context.close();
  });

  test("a regular member gets a 404 for the whole admin area, not a 'forbidden' that confirms it exists", async ({ browser }) => {
    const { context, page } = await asUser(browser, "fan");
    for (const path of [...STAFF_PAGES, ...ADMIN_ONLY_PAGES]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
    }
    for (const path of MEMBER_PAGES) expect((await page.goto(path))?.status(), path).toBe(200);
    await context.close();
  });

  test("a moderator can moderate, but admin-only pages are 404 for them", async ({ browser }) => {
    const { context, page } = await asUser(browser, "mod");
    for (const path of STAFF_PAGES) expect((await page.goto(path))?.status(), path).toBe(200);
    for (const path of ADMIN_ONLY_PAGES) expect((await page.goto(path))?.status(), path).toBe(404);
    // e-mail addresses are masked for moderators
    await page.goto("/admin/users");
    await expect(page.getByText("fan@e2e.test")).toHaveCount(0);
    await expect(page.getByText("f•••@e2e.test")).toBeVisible();
    await context.close();
  });

  test("an admin can open everything and sees full e-mail addresses", async ({ browser }) => {
    const { context, page } = await asUser(browser, "admin");
    for (const path of [...STAFF_PAGES, ...ADMIN_ONLY_PAGES]) expect((await page.goto(path))?.status(), path).toBe(200);
    await page.goto("/admin/users");
    await expect(page.getByText("fan@e2e.test")).toBeVisible();
    await context.close();
  });
});

test.describe("HTTP surface", () => {
  test("private APIs need a session and dangerous auth routes don't exist", async ({ request }) => {
    expect((await request.get("/api/notifications/unread")).status()).toBe(401);
    expect((await request.get("/api/auth/admin/list-users")).status()).toBe(404);
    for (const path of ["/api/auth/sign-up/email", "/api/auth/update-user", "/api/auth/admin/set-role", "/api/auth/admin/impersonate-user"]) {
      const res = await request.post(path, { data: {}, headers: { origin: E2E_BASE_URL } });
      expect(res.status(), path).toBe(404);
    }
  });

  test("the public feed API returns approved posts only, with no private fields, and validates its input", async ({ request }) => {
    const ok = await request.get("/api/community/posts");
    expect(ok.status()).toBe(200);
    expect(ok.headers()["cache-control"]).toBe("private, no-store");
    const body = await ok.json();
    expect(body.items.length).toBeGreaterThan(0);
    for (const item of body.items) {
      expect(item.status).toBe("approved");
      expect(Object.keys(item.author).sort()).toEqual(["id", "name"]);
    }
    expect(JSON.stringify(body)).not.toMatch(/@e2e\.test|moderationNote|email/);
    expect((await request.get("/api/community/posts?page=abc")).status()).toBe(400);
    expect((await request.get("/api/community/posts?sort=random")).status()).toBe(400);
    expect((await request.get("/api/community/posts?q=" + "x".repeat(500))).status()).toBe(400);
  });

  test("security headers are present, private pages are noindex, marketing stays indexable", async ({ request }) => {
    const feed = await request.get("/community");
    const h = feed.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("object-src 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["x-powered-by"]).toBeUndefined();

    expect((await request.get("/sign-in")).headers()["x-robots-tag"]).toContain("noindex");
    expect((await request.get("/api/community/posts")).headers()["x-robots-tag"]).toContain("noindex");
    expect(await (await request.get("/community")).text()).toContain('name="robots" content="noindex, follow"');
    expect(await (await request.get("/")).text()).toContain('name="robots" content="index, follow"');
  });

  test("the sign-in page ignores a hostile ?next= (no open redirect)", async ({ browser }) => {
    for (const next of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)"]) {
      const { context, page } = await anonymous(browser);
      await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
      await page.getByLabel("E-mail").fill("fan@e2e.test");
      await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page, next).toHaveURL(`${E2E_BASE_URL}/dashboard`);
      await context.close();
    }
  });
});

test.describe("user-written content is inert", () => {
  test("HTML in a post is shown as text: no element is created and no script runs", async ({ browser }) => {
    const payload = `<img src=x onerror="window.__xss=1"> <script>window.__xss=2</script> ${uniqueText("xss")}`;
    const fan = await asUser(browser, "fan");
    await fan.page.goto("/submit");
    await fan.page.getByLabel("Your delusion").fill(payload);
    await fan.page.getByRole("button", { name: "Send for review" }).click();
    await expect(fan.page.getByText("Sent for review.")).toBeVisible();
    await fan.context.close();

    const mod = await asUser(browser, "mod");
    await mod.page.goto("/admin/queue");
    const card = mod.page.getByRole("listitem").filter({ hasText: "window.__xss=1" });
    await expect(card).toBeVisible(); // shown literally even in the review desk
    expect(await mod.page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    await card.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(card.getByText("Approved.")).toBeVisible();
    await mod.context.close();

    const { context, page } = await anonymous(browser);
    const dialogs: string[] = [];
    page.on("dialog", (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    await page.goto("/community?q=window.__xss");
    await expect(page.getByText('<img src=x onerror="window.__xss=1">', { exact: false })).toBeVisible();
    await expect(page.locator("img[src='x']")).toHaveCount(0);
    await expect(page.locator("main script")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    expect(dialogs).toEqual([]);
    await context.close();
  });
});

test.describe("platform settings are really enforced", () => {
  test("an admin pauses submissions and sets a banner; members see both; then it is restored", async ({ browser }) => {
    const admin = await asUser(browser, "admin");
    await admin.page.goto("/admin/settings");
    await admin.page.getByRole("switch", { name: /Submissions open/ }).uncheck();
    await admin.page.getByLabel("Site announcement").fill("Exam season: reviews may take a little longer.");
    await admin.page.getByRole("button", { name: "Save settings" }).click();
    await expect(admin.page.getByText("Settings saved.")).toBeVisible();

    const fan = await asUser(browser, "fan");
    await fan.page.goto("/submit");
    await expect(fan.page.getByText("New submissions are paused right now.")).toBeVisible();
    await expect(fan.page.getByLabel("Your delusion")).toHaveCount(0);
    await fan.page.goto("/community");
    await expect(fan.page.getByRole("status").filter({ hasText: "Exam season: reviews may take a little longer." })).toBeVisible();

    await admin.page.getByRole("switch", { name: /Submissions open/ }).check();
    await admin.page.getByLabel("Site announcement").fill("");
    await admin.page.getByRole("button", { name: "Save settings" }).click();
    await expect(admin.page.getByText("Settings saved.")).toBeVisible();
    await fan.page.goto("/submit");
    await expect(fan.page.getByLabel("Your delusion")).toBeVisible();

    await admin.page.goto("/admin/audit?action=settings");
    await expect(admin.page.getByText("settings.updated").first()).toBeVisible();
    await admin.context.close();
    await fan.context.close();
  });

  test("blocked words are rejected without revealing the list", async ({ browser }) => {
    const admin = await asUser(browser, "admin");
    await admin.page.goto("/admin/settings");
    await admin.page.getByLabel("Blocked words and phrases").fill("zebracakes");
    await admin.page.getByRole("button", { name: "Save settings" }).click();
    await expect(admin.page.getByText("Settings saved.")).toBeVisible();

    const fan = await asUser(browser, "fan");
    await fan.page.goto("/submit");
    await fan.page.getByLabel("Your delusion").fill(`I will eat zebracakes before the exam ${Date.now()}`);
    await fan.page.getByRole("button", { name: "Send for review" }).click();
    await expect(fan.page.getByText("Contains a blocked word or phrase.")).toBeVisible();
    await expect(fan.page.getByText("zebracakes", { exact: false }).first()).toBeVisible(); // only because it's in their own textarea
    await expect(fan.page.getByRole("alert").getByText("zebracakes")).toHaveCount(0);

    await admin.page.getByLabel("Blocked words and phrases").fill("");
    await admin.page.getByRole("button", { name: "Save settings" }).click();
    await expect(admin.page.getByText("Settings saved.")).toBeVisible();
    await admin.context.close();
    await fan.context.close();
  });
});

test("sign-in works after all this (sanity)", async ({ page }) => {
  await signIn(page, "fan@e2e.test");
  await expect(page).toHaveURL(/\/dashboard/);
});

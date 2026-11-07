// AUDIT: real-interface flows that earlier specs only covered at the service level.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_BASE_URL, E2E_PASSWORD } from "./constants";
import { authState, registerAndVerify, signIn, uniqueText } from "./helpers";

test.describe.configure({ mode: "serial" });

const asAdmin = async (browser: Browser) => {
  const context = await browser.newContext({ storageState: authState("admin"), baseURL: E2E_BASE_URL });
  return { context, page: await context.newPage() };
};
const openMenu = async (page: Page) => {
  await page.locator("summary", { hasText: "Account menu for" }).click();
};

test.describe("account lifecycle through the real settings screens", () => {
  const email = `taylor-${Date.now()}@e2e.test`;
  const NEW_PASSWORD = "a-fresh-passphrase-for-taylor-77";
  const postText = uniqueText("Taylor's doomed plan");
  let userId = "";

  test("sign up, then edit the profile (valid, reserved name, and link in bio)", async ({ page }) => {
    await registerAndVerify(page, "Taylor Test", email);
    userId = await page.evaluate(async () => (await (await fetch("/api/auth/get-session")).json()).user.id);
    await page.goto("/settings");

    await page.getByLabel("Display name").fill("Moderator Max");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("That name is reserved.").first()).toBeVisible();

    await page.getByLabel("Display name").fill("Taylor T");
    await page.getByLabel("Bio (optional)").fill("visit www.spam.example now");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Remove the link or e-mail address.").first()).toBeVisible();

    await page.getByLabel("Bio (optional)").fill("Professional crammer. Amateur sleeper.");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved.")).toBeVisible();

    // the header and the public profile reflect it; the e-mail address never appears on the public page
    await page.goto(`/community`);
    await expect(page.locator("summary", { hasText: "Account menu for Taylor T" })).toBeAttached();
    const profile = await page.goto(`/u/${userId}`);
    expect(profile?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Taylor T" })).toBeVisible();
    await expect(page.getByText("Professional crammer. Amateur sleeper.")).toBeVisible();
    expect(await page.content()).not.toContain(email);
  });

  test("a post is submitted, then the password is changed (wrong current password refused)", async ({ page }) => {
    await signIn(page, email);
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto("/submit");
    await page.getByLabel("Your delusion").fill(postText);
    await page.getByRole("button", { name: "Send for review" }).click();
    await expect(page.getByText("Sent for review.")).toBeVisible();

    await page.goto("/settings");
    await page.getByLabel("Current password").fill("definitely-not-my-password");
    await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Your current password isn't right, or the new one is too short.")).toBeVisible();

    await page.getByLabel("Current password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Password changed. Your other devices were signed out.")).toBeVisible();
  });

  test("devices: a second sign-in shows up, and 'sign out other devices' really ends it", async ({ page, browser }) => {
    await signIn(page, email, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
    const second = await browser.newContext({ baseURL: E2E_BASE_URL });
    const other = await second.newPage();
    await signIn(other, email, NEW_PASSWORD);
    await expect(other).toHaveURL(/\/dashboard/);

    await page.goto("/settings");
    await expect(page.getByText("This device")).toBeVisible();
    // (the session from the previous test also survived the password change, as the then-current one: so 2 others)
    await page.getByRole("button", { name: /Sign out \d+ other devices?/ }).click();
    await expect(page.getByRole("button", { name: "No other devices" })).toBeVisible();

    await other.goto("/dashboard"); // the other device is signed out on its next request
    await expect(other).toHaveURL(/\/sign-in/);
    await second.close();
  });

  test("the old password no longer works; signing out from the menu really ends the session", async ({ page }) => {
    await signIn(page, email, E2E_PASSWORD);
    await expect(page.getByText(/don't match/)).toBeVisible();
    await signIn(page, email, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
    await openMenu(page);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(`${E2E_BASE_URL}/`);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/);
  });

  test("deleting the account: wrong password refused; right one removes the account and all their content", async ({ page, browser }) => {
    await signIn(page, email, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Delete my account…" }).click();
    const confirm = page.getByRole("button", { name: "Delete everything" });
    await expect(confirm).toBeDisabled(); // needs the password AND the acknowledgement
    await page.getByLabel("Enter your password to confirm").fill("wrong-password-here");
    await page.getByLabel(/I understand my account/).check();
    await confirm.click();
    await expect(page.getByText("That password isn't right.")).toBeVisible();

    await page.getByLabel("Enter your password to confirm").fill(NEW_PASSWORD);
    await confirm.click();
    await expect(page).toHaveURL(/\/sign-in\?notice=deleted/);
    await expect(page.getByText("Your account was deleted.")).toBeVisible();

    await signIn(page, email, NEW_PASSWORD);
    await expect(page.getByText(/don't match/)).toBeVisible(); // the account no longer exists
    expect((await page.goto(`/u/${userId}`))?.status()).toBe(404);

    const admin = await asAdmin(browser);
    await admin.page.goto(`/admin/posts?q=${encodeURIComponent(postText.slice(0, 30))}`);
    await expect(admin.page.getByText("No posts match")).toBeVisible(); // their pending post went with them
    await admin.page.goto("/admin/audit?action=account");
    await expect(admin.page.getByText("account.deleted").first()).toBeVisible();
    expect(await admin.page.content()).not.toContain(email);
    await admin.context.close();
  });
});

test.describe("the feed's search, filter and pagination controls", () => {
  test("search box, category and sort chips, empty state and clearing", async ({ page }) => {
    await page.goto("/community");
    await page.getByLabel("Search delusions and names").fill("highlighters");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=highlighters/);
    await expect(page.getByText("1 match for “highlighters”")).toBeVisible();
    await expect(page.getByText("I own six highlighters")).toBeVisible();

    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(`${E2E_BASE_URL}/community`);
    const categories = page.getByRole("navigation", { name: "Category" });
    await categories.getByRole("link", { name: "Exams", exact: true }).click();
    await expect(page).toHaveURL(/category=exams/);
    await expect(categories.getByRole("link", { name: "Exams", exact: true })).toHaveAttribute("aria-current", "true");
    await page.getByRole("link", { name: "Most reacted" }).click();
    await expect(page).toHaveURL(/sort=top/);
    await expect(page).toHaveURL(/category=exams/); // filters combine

    await page.getByLabel("Search delusions and names").fill("zzzz-nothing-matches-this");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("Nothing matches that")).toBeVisible();
    await page.getByRole("link", { name: "Show everything" }).click();
    await expect(page).toHaveURL(`${E2E_BASE_URL}/community`);
  });

  test("pagination: more than 12 live posts make several pages, with working Older/Newer links and no overlap", async ({ page, request }) => {
    // The total depends on what earlier specs approved or removed, so read it instead of assuming a number.
    const total = ((await (await request.get("/api/community/posts")).json()) as { total: number }).total;
    expect(total).toBeGreaterThan(12);
    const pages = Math.ceil(total / 12);

    await page.goto("/community");
    await expect(page.getByText(`${total} delusions`)).toBeVisible();
    await expect(page.getByText(`Page 1 of ${pages}`)).toBeVisible();
    const ids = async () => page.locator("article").evaluateAll((els) => els.map((e) => e.getAttribute("aria-labelledby") as string));
    const first = await ids();
    expect(first).toHaveLength(12);
    await page.getByRole("link", { name: /Older/ }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(`Page 2 of ${pages}`)).toBeVisible();
    const second = await ids();
    expect(second).toHaveLength(Math.min(12, total - 12));
    expect(new Set([...first, ...second]).size).toBe(first.length + second.length); // no post appears on both pages
    await page.getByRole("link", { name: /Newer/ }).click();
    await expect(page).toHaveURL(`${E2E_BASE_URL}/community`);
  });
});

test.describe("sign-out is reachable on a phone", () => {
  test("the account menu in the header works at 390px", async ({ browser }) => {
    const context = await browser.newContext({ storageState: authState("fan"), baseURL: E2E_BASE_URL, viewport: { width: 390, height: 800 } });
    const page = await context.newPage();
    await page.goto("/dashboard");
    await openMenu(page);
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
    await context.close();
  });
});

test.describe("notification bell with a double-digit unread count (regression: WCAG 2.5.3)", () => {
  test("shows 9+, announces the real number, and passes the visible-text-in-name rule", async ({ browser }) => {
    const context = await browser.newContext({ storageState: authState("fan"), baseURL: E2E_BASE_URL, viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto("/dashboard");
    const bell = page.getByRole("link", { name: /^Notifications, \d+ unread$/ });
    await expect(bell).toBeVisible();
    const n = Number((await bell.textContent())!.match(/(\d+) unread/)![1]);
    expect(n, "the seed approves 17 of the fan's posts, so there must be more than 9 unread").toBeGreaterThan(9);
    await expect(bell.locator("span[aria-hidden]")).toHaveText("9+"); // what sighted users see
    const AxeBuilder = (await import("@axe-core/playwright")).default;
    const r = await new AxeBuilder({ page }).include("header").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    await context.close();
  });
});

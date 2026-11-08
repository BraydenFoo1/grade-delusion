import { expect, test, type Browser } from "@playwright/test";
import { E2E_BASE_URL, E2E_PASSWORD } from "./constants";
import { authState, latestMail, linkIn, registerAndVerify, signIn, signUp, uniqueText } from "./helpers";

// One story, told in order: a new student joins, posts, is moderated, gets reactions, comments and a report,
// and a moderator removes the post. Serial because each step builds on the one before.
test.describe.configure({ mode: "serial" });

const email = `sam-${Date.now()}@e2e.test`;
const text = uniqueText("Sam's delusion");
let postId = "";

async function asUser(browser: Browser, who: "admin" | "mod" | "fan") {
  const context = await browser.newContext({ storageState: authState(who), baseURL: E2E_BASE_URL });
  return { context, page: await context.newPage() };
}

test("a new student signs up and cannot sign in until the e-mail is confirmed", async ({ page }) => {
  await signUp(page, "Sam Student", email);
  await expect(page.getByRole("heading", { name: "Check your e-mail" })).toBeVisible();

  // Unconfirmed: sign-in is refused, and a fresh link is sent.
  await signIn(page, email);
  await expect(page.getByText("Confirm your e-mail first")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);

  // The link in the e-mail confirms the address and signs them in.
  const mail = await latestMail(email, /confirm/i);
  await page.goto(linkIn(mail));
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /Hi, Sam Student/ })).toBeVisible();
  // (The welcome banner only rides on the very first link; this one came from the sign-in attempt.)
});

test("signing up again with the same address reveals nothing", async ({ page }) => {
  await signUp(page, "Impostor", email); // same neutral page as a new sign-up
  await expect(page.getByRole("heading", { name: "Check your e-mail" })).toBeVisible();
  const warning = await latestMail(email, /already|tried/i);
  expect(warning.subject).toMatch(/already|tried/i);
});

test("the student submits a delusion: it is pending and nobody else can see it", async ({ page, browser, request }) => {
  // sign in (state from the previous test isn't shared across contexts)
  await signIn(page, email);
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/submit");
  await page.getByLabel("Your delusion").fill(text);
  // The radios are visually hidden inside clickable chips (the accessible pattern): click the chip like a person would.
  await page.locator("label", { hasText: "Exams" }).click();
  await expect(page.getByLabel("Exams")).toBeChecked();
  await page.getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByText("Sent for review.")).toBeVisible();

  await page.goto("/my-submissions");
  const card = page.getByRole("listitem").filter({ hasText: text });
  await expect(card).toBeVisible();
  await expect(card.getByText("In review")).toBeVisible();
  const editHref = await card.getByRole("link", { name: /Edit/ }).getAttribute("href");
  postId = editHref!.split("/")[2];
  expect(postId).toMatch(/^[0-9a-f-]{36}$/);

  // Not in the public feed, not at its URL, not in the API: for an anonymous visitor...
  const anon = await browser.newContext({ baseURL: E2E_BASE_URL });
  const anonPage = await anon.newPage();
  await anonPage.goto("/community?q=" + encodeURIComponent("Sam's delusion"));
  await expect(anonPage.getByText(text)).toHaveCount(0);
  const direct = await anonPage.goto(`/community/${postId}`);
  expect(direct?.status()).toBe(404);
  const api = await request.get(`/api/community/posts?q=${encodeURIComponent("Sam's delusion")}`);
  expect((await api.json()).total).toBe(0);
  await anon.close();

  // ...and for another signed-in member.
  const fan = await asUser(browser, "fan");
  expect((await fan.page.goto(`/community/${postId}`))?.status()).toBe(404);
  expect((await fan.page.goto(`/my-submissions/${postId}/edit`))?.status()).toBe(404);
  await fan.context.close();
});

test("a moderator approves it from the review desk and it goes live", async ({ browser }) => {
  const mod = await asUser(browser, "mod");
  await mod.page.goto("/admin/queue");
  const card = mod.page.getByRole("listitem").filter({ hasText: text });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(card.getByText("Approved. It's live now.")).toBeVisible();
  await mod.context.close();

  const anon = await browser.newContext({ baseURL: E2E_BASE_URL });
  const page = await anon.newPage();
  expect((await page.goto(`/community/${postId}`))?.status()).toBe(200);
  await expect(page.getByText(text)).toBeVisible();
  await page.goto("/community?q=" + encodeURIComponent("Sam's delusion"));
  await expect(page.getByText(text)).toBeVisible();
  await anon.close();
});

test("the student is told, and sees it in their notifications", async ({ page }) => {
  await signIn(page, email);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("link", { name: /Notifications, \d+ unread/ })).toBeVisible();
  await page.goto("/notifications");
  await expect(page.getByText("Your delusion was approved and is now live in the community.")).toBeVisible();
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.getByRole("link", { name: "Notifications", exact: true })).toBeVisible();
});

test("another member reacts, comments, replies and reports", async ({ browser }) => {
  const fan = await asUser(browser, "fan");
  const page = fan.page;
  await page.goto(`/community/${postId}`);

  const relatable = page.getByRole("button", { name: /^Relatable/ });
  await relatable.click();
  await expect(relatable).toHaveAttribute("aria-pressed", "true");
  await expect(relatable).toHaveAccessibleName("Relatable, 1 reaction");
  // changing the reaction replaces it, clicking again clears it
  await page.getByRole("button", { name: /^I'm dead/ }).click();
  await expect(relatable).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: /^I'm dead/ }).click();
  await expect(page.getByRole("button", { name: /^I'm dead/ })).toHaveAttribute("aria-pressed", "false");

  await page.getByLabel("Write a comment").fill("Same energy honestly");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(page.getByText("Same energy honestly")).toBeVisible();
  await expect(page.getByRole("heading", { name: "1 comment" })).toBeVisible();

  // links are rejected as spam
  await page.getByLabel("Write a comment").fill("buy now at www.spam.example");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Remove the link or e-mail address." })).toBeVisible();

  // report the post
  await page.getByRole("button", { name: "Report" }).first().click();
  await page.getByLabel("Spam or advertising").check();
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("Thanks. A moderator will take a look.")).toBeVisible();
  await fan.context.close();
});

test("the author replies to the comment, and can't report their own post", async ({ page }) => {
  await signIn(page, email);
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto(`/community/${postId}`);
  await expect(page.getByRole("button", { name: "Report" })).toHaveCount(1); // only on the comment, not their own post
  await page.getByRole("button", { name: "Reply" }).click();
  await page.getByLabel("Write a reply").fill("Thank you, comrade");
  await page.getByRole("button", { name: "Reply", exact: true }).last().click();
  await expect(page.getByText("Thank you, comrade")).toBeVisible();
  await expect(page.getByRole("heading", { name: "2 comments" })).toBeVisible();
});

test("a moderator handles the report by removing the post, which disappears everywhere", async ({ browser }) => {
  const mod = await asUser(browser, "mod");
  await mod.page.goto("/admin/reports");
  const card = mod.page.getByRole("listitem").filter({ hasText: text });
  await expect(card).toBeVisible();
  await expect(card.getByText("Spam or advertising")).toBeVisible();
  await card.getByRole("button", { name: "Remove content…" }).click();
  await card.getByRole("button", { name: "Unkind or targets someone" }).click();
  await card.getByRole("button", { name: "Remove it" }).click();
  await expect(card.getByText("Report closed.")).toBeVisible();
  await mod.context.close();

  const anon = await browser.newContext({ baseURL: E2E_BASE_URL });
  const page = await anon.newPage();
  expect((await page.goto(`/community/${postId}`))?.status()).toBe(404);
  await page.goto("/community");
  await expect(page.getByText(text)).toHaveCount(0);
  await anon.close();
});

test("the author sees the removal and the moderator's note, and can no longer edit it", async ({ page }) => {
  await signIn(page, email);
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/my-submissions");
  const card = page.getByRole("listitem").filter({ hasText: text });
  await expect(card.getByText("Removed")).toBeVisible();
  await expect(card.getByText("Moderator note: Unkind or targets someone")).toBeVisible();
  await expect(card.getByRole("link", { name: /Edit/ })).toHaveCount(0);
  expect((await page.goto(`/my-submissions/${postId}/edit`))?.status()).toBe(200);
  await expect(page.getByText("A moderator removed this post, so it can't be edited.")).toBeVisible();
});

test("a moderator suspends the student: signed out at once, can't sign back in, and is told why", async ({ browser, page }) => {
  await signIn(page, email);
  await expect(page).toHaveURL(/\/dashboard/);

  const admin = await asUser(browser, "admin");
  await admin.page.goto("/admin/users?q=Sam+Student");
  await admin.page.getByRole("link", { name: "Sam Student" }).click();
  await admin.page.getByLabel("Reason (the user is told)").fill("Testing the suspension flow");
  await admin.page.getByRole("button", { name: "Suspend account" }).click();
  await expect(admin.page.getByText(/Suspended until/)).toBeVisible();
  await admin.context.close();

  // the already-open session is dead on the very next request
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
  await signIn(page, email);
  await expect(page.getByText(/This account is suspended/)).toBeVisible();
});

test("password reset: the old password stops working, the new one works", async ({ page }) => {
  const resetEmail = `reset-${Date.now()}@e2e.test`;
  await registerAndVerify(page, "Riley Reset", resetEmail);
  await page.context().clearCookies();

  await page.goto("/forgot-password");
  await page.getByLabel("E-mail").fill(resetEmail);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your inbox.")).toBeVisible();

  const mail = await latestMail(resetEmail, /reset/i);
  await page.goto(linkIn(mail));
  await expect(page).toHaveURL(/\/reset-password\?token=/);
  const newPassword = "a-brand-new-passphrase-99";
  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/sign-in\?notice=reset/);
  await expect(page.getByText("Password changed.")).toBeVisible();

  await signIn(page, resetEmail, E2E_PASSWORD); // old password
  await expect(page.getByText(/don't match/)).toBeVisible();
  await signIn(page, resetEmail, newPassword);
  await expect(page).toHaveURL(/\/dashboard/);
});

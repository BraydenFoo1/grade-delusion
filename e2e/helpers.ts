import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { E2E_AUTH_DIR, E2E_OUTBOX, E2E_PASSWORD, type E2EUserKey } from "./constants";

export type Mail = { to: string; subject: string; html: string; text: string };

/** Signed-in browser state for a seeded account (created once by auth.setup.ts). */
export const authState = (key: E2EUserKey) => path.resolve(process.cwd(), E2E_AUTH_DIR, `${key}.json`);

/** The newest e-mail the app "sent" to this address (the dev outbox is a folder of JSON files). */
export async function latestMail(to: string, subject?: RegExp, timeoutMs = 15_000): Promise<Mail> {
  const dir = path.resolve(process.cwd(), E2E_OUTBOX);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const mails = readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .sort()
        .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Mail)
        .filter((m) => m.to === to && (!subject || subject.test(m.subject)));
      if (mails.length) return mails[mails.length - 1];
    } catch {
      /* outbox not created yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No e-mail to ${to}${subject ? ` matching ${subject}` : ""} arrived in ${timeoutMs}ms`);
}

export const linkIn = (mail: Mail): string => {
  const m = mail.text.match(/https?:\/\/\S+/);
  if (!m) throw new Error(`No link in "${mail.subject}"`);
  return m[0];
};

/** Fill the sign-up form (13+ and terms ticked) and submit it. */
export async function signUp(page: Page, name: string, email: string, password = E2E_PASSWORD) {
  await page.goto("/sign-up");
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("I'm 13 or older.").check();
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/check-email/);
}

/** Sign up, then open the confirmation link from the e-mail: lands signed in on the dashboard. */
export async function registerAndVerify(page: Page, name: string, email: string, password = E2E_PASSWORD) {
  await signUp(page, name, email, password);
  const mail = await latestMail(email, /confirm/i);
  await page.goto(linkIn(mail));
  await expect(page).toHaveURL(/\/dashboard\?welcome=1/);
  await expect(page.getByText("E-mail confirmed, welcome aboard.")).toBeVisible();
}

export async function signIn(page: Page, email: string, password = E2E_PASSWORD) {
  await page.goto("/sign-in");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

let n = 0;
/** Post text that is unique per call (the duplicate check rejects repeats) and passes the content rules. */
export const uniqueText = (label: string) => `${label} ${Date.now()}-${++n}: I will definitely start revising tomorrow`;

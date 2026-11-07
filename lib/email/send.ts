import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { emailFrom, isProduction, outboxDir, resendApiKey } from "../env";
import { ensureDataDir } from "../db/data-dir";
import type { Mail } from "./templates";

export type Mailer = (mail: Mail) => Promise<void>;

/** Production transport. Throws on any Resend error so failures are logged rather than silently lost. */
function resendMailer(apiKey: string): Mailer {
  const resend = new Resend(apiKey);
  return async (mail) => {
    const { error } = await resend.emails.send({ from: emailFrom(), to: mail.to, subject: mail.subject, html: mail.html, text: mail.text });
    if (error) throw new Error(`Resend rejected the message: ${error.name}: ${error.message}`);
  };
}

/**
 * Development transport: writes each message to .data/outbox/ (git-ignored) and prints a one-line
 * summary, so sign-up and password-reset links work with no e-mail service. Never used in production.
 */
function devOutboxMailer(): Mailer {
  return async (mail) => {
    ensureDataDir();
    const dir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), outboxDir());
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
    await writeFile(file, JSON.stringify({ ...mail, createdAt: new Date().toISOString() }, null, 2));
    console.info(`[mail:dev] "${mail.subject}" → ${mail.to} (saved to ${path.relative(process.cwd(), file)})`);
  };
}

export function getMailer(): Mailer {
  const key = resendApiKey();
  if (key) return resendMailer(key);
  if (isProduction()) {
    return async () => {
      throw new Error("RESEND_API_KEY is not set, so e-mail can't be sent. See docs/ENVIRONMENT.md.");
    };
  }
  return devOutboxMailer();
}

/**
 * Send without making the HTTP response wait for the e-mail provider. This keeps response times the
 * same whether or not an address exists (no account-enumeration timing signal). On Vercel, `after()`
 * keeps the function alive until the send finishes; outside a request it falls back to fire-and-forget.
 */
export async function sendMailInBackground(mail: Mail, mailer: Mailer = getMailer()): Promise<void> {
  const task = async () => {
    try {
      await mailer(mail);
    } catch (err) {
      console.error(`[mail] failed to send "${mail.subject}"`, err);
    }
  };
  try {
    const { after } = await import("next/server");
    after(task);
  } catch {
    void task();
  }
}

import { createAuth, type Auth } from "@/lib/auth/create";
import type { AppDb } from "@/lib/db/types";
import type { Mail } from "@/lib/email/templates";
import type { TestDb } from "./db";

export const BASE_URL = "http://localhost:3000";

export function createTestAuth(db: TestDb, opts: { rateLimit?: boolean } = {}) {
  const mails: Mail[] = [];
  const auth: Auth = createAuth({
    db: db as unknown as AppDb,
    baseURL: BASE_URL,
    secret: "test-secret-test-secret-test-secret-123456",
    production: false,
    rateLimitEnabled: opts.rateLimit ?? false,
    sendMail: (m) => {
      mails.push(m);
    },
  });
  return { auth, mails };
}

/** The first URL inside an e-mail's plain-text body (verification / reset link). */
export function linkIn(mail: Mail): string {
  const m = mail.text.match(/https?:\/\/\S+/);
  if (!m) throw new Error(`No link in mail "${mail.subject}"`);
  return m[0];
}

export const tokenFromLink = (link: string): string => {
  const u = new URL(link);
  return u.searchParams.get("token") ?? u.pathname.split("/").pop() ?? "";
};

/** Turn a sign-in Response's Set-Cookie headers into a Cookie header for follow-up calls. */
export function cookieFrom(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

export const PASSWORD = "correct horse battery staple";

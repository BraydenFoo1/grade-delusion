import "server-only";

import { getDb } from "../db/client";
import { assertProductionEmailConfig, authRateLimitEnabled, authSecret, baseUrl, extraTrustedOrigins, isProduction } from "../env";
import { sendMailInBackground } from "../email/send";
import { createAuth, type Auth } from "./create";

const globalForAuth = globalThis as unknown as { __gradeDelusionAuth?: Promise<Auth> };

/**
 * The shared Better Auth instance. Created lazily on first use (never at import time), so
 * `next build` doesn't need a database or secrets.
 */
export function getAuth(): Promise<Auth> {
  globalForAuth.__gradeDelusionAuth ??= (async () => {
    assertProductionEmailConfig();
    return createAuth({
      db: await getDb(),
      baseURL: baseUrl(),
      secret: authSecret(),
      trustedOrigins: extraTrustedOrigins(),
      production: isProduction(),
      rateLimitEnabled: authRateLimitEnabled(),
      sendMail: (mail) => sendMailInBackground(mail),
      nextCookies: true,
    });
  })().catch((err) => {
    globalForAuth.__gradeDelusionAuth = undefined;
    throw err;
  });
  return globalForAuth.__gradeDelusionAuth;
}

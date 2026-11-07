// Typed, lazy access to environment variables. Nothing here reads a value at import time, so
// `next build` (which imports every route module) never needs secrets or a database.
//
// Documented in docs/ENVIRONMENT.md. Real values live in .env.local (git-ignored) and in Vercel's
// environment settings, never in the repository.

/**
 * Explicit opt-in for running a PRODUCTION BUILD on this machine (end-to-end tests, local preview with
 * `next start`): it turns on the local fallbacks (embedded database, dev e-mail outbox, dev secret).
 * It is ignored whenever Vercel's own `VERCEL` variable is present, so it can never take effect on a
 * Vercel deployment. Never set it anywhere that serves real users.
 */
export const isLocalOverride = () => process.env.GD_LOCAL === "1" && !process.env.VERCEL;

/** True only on a real deployment: production build, and not running under the local override. */
export const isProduction = () => process.env.NODE_ENV === "production" && !isLocalOverride();
export const isTest = () => process.env.NODE_ENV === "test" || process.env.VITEST === "true";

/** Neon pooled connection string. Optional outside production (a local PGlite database is used instead). */
export function databaseUrl(): string | undefined {
  const v = process.env.DATABASE_URL?.trim();
  return v ? v : undefined;
}

/** Placeholder used only for local development and tests; production refuses to start with it. */
export const DEV_AUTH_SECRET = "development-only-secret-do-not-use-in-production-0123456789";

export function authSecret(): string {
  const v = process.env.BETTER_AUTH_SECRET?.trim();
  if (v) {
    if (isProduction() && v.length < 32) throw new Error("BETTER_AUTH_SECRET must be at least 32 characters in production.");
    return v;
  }
  if (isProduction()) throw new Error("BETTER_AUTH_SECRET is required in production. See docs/ENVIRONMENT.md.");
  return DEV_AUTH_SECRET;
}

/** Public base URL of this deployment (used in e-mail links and for the origin check). */
export function baseUrl(): string {
  const explicit = process.env.BETTER_AUTH_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  // VERCEL_URL is the per-deployment host, so it is only right for previews. On production it would put
  // an unstable *.vercel.app host in every e-mail link and origin check, so production must set the URL.
  const vercel = process.env.VERCEL_ENV === "production" ? undefined : process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  if (isProduction() || process.env.VERCEL_ENV === "production") throw new Error("BETTER_AUTH_URL is required in production. See docs/ENVIRONMENT.md.");
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/** Extra origins allowed to call the auth API (comma separated), e.g. a custom domain next to *.vercel.app. */
export function extraTrustedOrigins(): string[] {
  const explicit = (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  // Host names Vercel injects for THIS deployment (its production alias, its preview URL, its branch URL). They are
  // set by the platform, not by visitors, so trusting them is safe, and it stops sign-in from failing with
  // "invalid origin" when a member reaches the site through a second address of the same deployment.
  const vercel = ["VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL", "VERCEL_BRANCH_URL"]
    .map((k) => process.env[k]?.trim())
    .filter((h): h is string => Boolean(h) && /^[a-z0-9.-]+$/i.test(h as string))
    .map((h) => `https://${h}`);
  return [...new Set([...explicit, ...vercel])];
}

export const resendApiKey = () => process.env.RESEND_API_KEY?.trim() || undefined;
/**
 * The From address. In production it must be set explicitly and be a real sender on a domain verified in Resend:
 * Resend's sandbox sender silently delivers only to the account owner, so a missing value would mean no member
 * ever receives a confirmation e-mail. (Development falls back to the sandbox sender; nothing is sent there.)
 */
export function emailFrom(): string {
  const v = process.env.EMAIL_FROM?.trim();
  if (!v) {
    if (isProduction()) throw new Error('EMAIL_FROM is required in production, e.g. "Grade Delusion <no-reply@your-domain>". See docs/ENVIRONMENT.md.');
    return "Grade Delusion <onboarding@resend.dev>";
  }
  if (!/^[^<>@\s]+@[^<>@\s]+$|<[^<>@\s]+@[^<>@\s]+>\s*$/.test(v)) {
    throw new Error('EMAIL_FROM must be a valid sender such as "Grade Delusion <no-reply@your-domain>".');
  }
  return v;
}

/** Called when auth is first used: a deployment that can't send e-mail must fail loudly, before anyone signs up. */
export function assertProductionEmailConfig(): void {
  if (!isProduction()) return;
  if (!resendApiKey()) throw new Error("RESEND_API_KEY is required in production, otherwise no confirmation or reset e-mail can be sent. See docs/ENVIRONMENT.md.");
  emailFrom();
}

/**
 * Better Auth's own rate limiter (sign-in, password reset…). On in production; off by default in
 * development and tests so repeated sign-ins don't trip it. Set GD_RATE_LIMIT=1 to test it locally.
 */
export function authRateLimitEnabled(): boolean {
  if (process.env.GD_RATE_LIMIT === "1") return true;
  if (process.env.GD_RATE_LIMIT === "0") return false;
  return isProduction();
}

/** Where the local PGlite database lives. `memory://` gives a throw-away database (used by e2e). */
export const pgliteDir = () => process.env.GD_PGLITE_DIR?.trim() || ".data/pglite";

/** Where the development e-mail outbox lives (development only). */
export const outboxDir = () => process.env.GD_OUTBOX_DIR?.trim() || ".data/outbox";

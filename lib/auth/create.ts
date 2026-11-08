// Better Auth configuration. A factory (not a module-level singleton) so tests can build the real
// thing against an in-memory database with a capturing mailer.
//
// Security posture, in one place:
//  - E-mail + password only; e-mail verification is REQUIRED before a session can exist.
//  - Registration goes through our own server action (zod validation, honeypot, IP rate limit, the
//    13+ and terms checks, display-name rules), so Better Auth's raw /sign-up/email HTTP route is off.
//  - Profile edits go through our own action too, so /update-user is off (otherwise a user could skip
//    the display-name rules). Roles and bans are only changed by our services, so every /admin/* HTTP
//    route of the admin plugin is off as well; the plugin is used for its columns and ban enforcement only.
//  - `role`, `banned`, `banReason`, `banExpires` are declared `input: false` by the plugin: a client can't set them.
//  - No cookie cache: a ban or role change takes effect on the very next request.
//  - Telemetry off. Social login not configured.

import { and, count, eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import type { AppDb } from "../db/types";
import { account, rateLimit, session, user, verification } from "../db/schema";
import { existingAccountEmail, resetPasswordEmail, verificationEmail, type Mail } from "../email/templates";
import { LIMITS } from "../platform/constants";
import { displayName } from "../platform/validation";
import { recordAudit } from "../services/audit";

export type AuthDeps = {
  db: AppDb;
  baseURL: string;
  secret: string;
  trustedOrigins?: string[];
  production: boolean;
  rateLimitEnabled: boolean;
  /** Called for every transactional e-mail. Implementations should not make the caller wait (see sendMailInBackground). */
  sendMail: (mail: Mail) => void | Promise<void>;
  /** Enable the Next.js cookie plugin so server actions can set session cookies. Off in unit tests. */
  nextCookies?: boolean;
};

/** HTTP routes that must not be reachable from the browser. Server-side `auth.api.*` calls are unaffected. */
export const DISABLED_PATHS = [
  // we validate and rate limit registration ourselves (app/(platform)/actions/auth.ts)
  "/sign-up/email",
  // profile changes go through our own action (display-name rules, blocked terms)
  "/update-user",
  "/update-session",
  "/verify-password",
  "/change-email",
  // no social or linked accounts
  "/sign-in/social",
  "/link-social",
  "/unlink-account",
  "/list-accounts",
  "/account-info",
  "/get-access-token",
  "/refresh-token",
  // admin plugin: our services own roles, bans and user management
  "/admin/ban-user",
  "/admin/unban-user",
  "/admin/create-user",
  "/admin/get-user",
  "/admin/has-permission",
  "/admin/impersonate-user",
  "/admin/stop-impersonating",
  "/admin/list-user-sessions",
  "/admin/list-users",
  "/admin/remove-user",
  "/admin/revoke-user-session",
  "/admin/revoke-user-sessions",
  "/admin/set-role",
  "/admin/set-user-password",
  "/admin/update-user",
] as const;

export function createAuth(deps: AuthDeps) {
  const { db } = deps;
  const origins = [deps.baseURL, ...(deps.trustedOrigins ?? [])];

  return betterAuth({
    appName: "Grade Delusion",
    baseURL: deps.baseURL,
    secret: deps.secret,
    trustedOrigins: origins,
    telemetry: { enabled: false },
    disabledPaths: [...DISABLED_PATHS],

    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification, rateLimit },
    }),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: LIMITS.passwordMin,
      maxPasswordLength: LIMITS.passwordMax,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user: u, url }) => {
        await deps.sendMail(resetPasswordEmail({ to: u.email, name: u.name, url }));
      },
      // Someone signing up with an existing address learns nothing on screen; the owner gets an e-mail instead.
      onExistingUserSignUp: async ({ user: u }) => {
        await deps.sendMail(existingAccountEmail({ to: u.email, name: u.name, signInUrl: `${deps.baseURL}/sign-in` }));
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true, // an unverified user who tries to sign in gets a fresh link
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user: u, url }) => {
        await deps.sendMail(verificationEmail({ to: u.email, name: u.name, url }));
      },
    },

    user: {
      additionalFields: {
        bio: { type: "string", required: false, input: false },
        ageConfirmedAt: { type: "date", required: false, input: false },
        termsAcceptedAt: { type: "date", required: false, input: false },
      },
      changeEmail: { enabled: false },
      deleteUser: {
        enabled: true,
        // The platform must never be left without an admin.
        beforeDelete: async (u) => {
          if ((u as { role?: string }).role !== "admin") return;
          const [{ n }] = await db.select({ n: count() }).from(user).where(and(eq(user.role, "admin")));
          if (Number(n) <= 1) {
            throw new APIError("FORBIDDEN", { message: "You're the only admin. Make someone else an admin before deleting your account." });
          }
        },
        // No e-mail address, name or content is written to the audit log: only that a deletion happened.
        afterDelete: async (u) => {
          await recordAudit(db, { action: "account.deleted", targetType: "user", targetId: u.id, details: { selfService: true } });
        },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 10,
      // Deliberately no cookieCache: bans and role changes must apply immediately.
    },

    rateLimit: {
      enabled: deps.rateLimitEnabled,
      storage: "database", // shared across serverless instances (in-memory counters reset per cold start)
      window: 10,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/request-password-reset": { window: 600, max: 5 },
        "/send-verification-email": { window: 600, max: 5 },
        "/reset-password": { window: 600, max: 10 },
        "/change-password": { window: 600, max: 10 },
        "/delete-user": { window: 600, max: 5 },
      },
    },

    advanced: {
      // Pinned on explicitly: Better Auth skips these when NODE_ENV=test, and a security check
      // shouldn't depend on an environment variable.
      disableOriginCheck: false,
      disableCSRFCheck: false,
      cookiePrefix: "gd",
      useSecureCookies: deps.production,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: deps.production },
    },

    databaseHooks: {
      user: {
        create: {
          // Last line of defence: whatever path creates a user, the name is valid and consent is recorded.
          before: async (u) => {
            const name = displayName.safeParse(u.name);
            if (!name.success) throw new APIError("BAD_REQUEST", { message: name.error.issues[0]?.message ?? "Invalid display name." });
            const now = new Date();
            return {
              data: { ...u, name: name.data, email: u.email.trim().toLowerCase(), ageConfirmedAt: now, termsAcceptedAt: now },
            };
          },
        },
      },
    },

    plugins: [
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
        bannedUserMessage: "Your account has been suspended. If you think this is a mistake, contact the Grade Delusion team.",
      }),
      ...(deps.nextCookies ? [nextCookies()] : []), // must be last
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

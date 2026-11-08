# Security notes

This documents what the community platform does, what it does **not** do, and what is still your call.
(The repository-level `SECURITY.md` is the vulnerability-reporting policy.)

## Threat model in one paragraph

Open registration for people aged 13+, user-written text shown to other users, and a moderation workflow. The main
risks are: account takeover, privilege escalation (a member becoming staff), leaking unapproved content or private
data, content injection (XSS), abuse and spam, and harm to minors. Each is addressed below and has tests.

## Controls and where they are tested

| Risk | Control | Tests |
|---|---|---|
| Server-side authorization | Every action calls `run(level)` **and** the service re-checks the role (`lib/platform/actor.ts`). Admin pages call `staffPage()` / `adminPage()` themselves (a layout is not a boundary). Non-staff get a **404** for `/admin`, not a "forbidden". | `tests/unit/platform.test.ts`, `tests/services/*`, `e2e/security.spec.ts` |
| Privilege escalation | Roles/bans are not client-settable; `update-user` and all `admin/*` auth routes are disabled; nobody can change their own role or act on admins. | `tests/auth/auth.test.ts`, `tests/services/admin.test.ts` |
| Unapproved content leaking | Public queries filter `status = 'approved'`. Pending, rejected, removed, edited-after-approval posts return 404 on the page, the API and for comments/reactions/reports. Removed comments never send their text to the browser. | `tests/services/posts.test.ts` ("leak tests"), `e2e/journey.spec.ts` |
| Private data exposure | Public queries select explicit columns (no e-mail, no moderator notes). Profiles of suspended users 404. Moderators see masked e-mail addresses. Audit rows hold ids and states, never e-mail or post text. | `tests/services/admin.test.ts`, `e2e/security.spec.ts` |
| XSS | User text is rendered by React as text only; no `dangerouslySetInnerHTML` on user data. A post containing `<img onerror>` and `<script>` renders as literal text and runs nothing. CSP blocks inline handlers' network effects and framing. E-mail templates HTML-escape every value. | `e2e/security.spec.ts` |
| CSRF | Better Auth origin + Fetch-Metadata checks (pinned on); `SameSite=Lax` cookies; Next.js server-action origin check. | `tests/auth/auth.test.ts` |
| Injection | All SQL via Drizzle (parameterised); `LIKE` wildcards in search are escaped; inputs validated with Zod; DB CHECK constraints as a second line. | `tests/services/posts.test.ts` |
| Open redirect | `?next=` is only honoured for same-site paths. | `e2e/security.spec.ts` |
| Brute force / abuse | Better Auth limiter (database-backed) for auth routes; application limiter for posts, comments, reports, reactions, sign-ups; honeypot; spam heuristics; duplicate detection. | `tests/auth`, `tests/services/*` |
| Tampering with history | `audit_log` and `moderation_action` are append-only **in the database** (trigger). | `tests/db/schema.test.ts` |
| Secrets | Only in `.env.local` / Vercel. Production refuses to start without them. Scripts never read `.env.local` and refuse remote databases without `--confirm`. | `docs/ENVIRONMENT.md` |
| Headers | CSP (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`), HSTS (production), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP; private areas also send `X-Robots-Tag: noindex`. | `e2e/security.spec.ts` |

## Known trade-offs and gaps (be aware)

1. **CSP allows `'unsafe-inline'` for scripts.** Next.js inlines hydration data and the site embeds JSON-LD; a
   nonce-based CSP would force every page, including the static marketing pages, to render dynamically. All other
   directives are strict, and user content is never HTML.
2. **No CAPTCHA.** Sign-up relies on e-mail confirmation, rate limits and a honeypot. If bots appear, add Cloudflare
   Turnstile to the sign-up form.
3. **No two-factor authentication** (not requested). Staff accounts are the highest-value targets; consider it next.
4. **E-mail change is disabled** (an account-takeover vector): members contact the team instead.
5. **Pre-moderation only reviews posts.** Comments are visible immediately (rate-limited, link-filtered, reportable).
   Switching comments to pre-moderation would be a small change in `lib/services/comments.ts`.
6. **Search is `ILIKE`.** Fine for thousands of posts; add a `pg_trgm` index if the feed grows large.
7. **IP addresses** for rate limiting come from `x-forwarded-for`. On Vercel the platform sets it; behind any other
   proxy, configure trusted proxies before relying on it.
8. **Dependency audit:** `npm audit` reports only a *moderate* advisory in `esbuild` pulled in by `drizzle-kit`, a
   **development-only** tool that doesn't run esbuild's dev server. The suggested "fix" downgrades drizzle-kit to a
   version years old, so it is deliberately not applied. Re-check periodically.
9. **Existing production site:** the site was found running Next.js 16.3.8, which has advisories (including a Server
   Actions denial of service and an image-optimizer RCE). This branch upgrades to 16.4.x. Deploying that upgrade soon
   is worthwhile **regardless of this feature**.

- **Sign-in throttling is per IP only.** Sign-in attempts are limited per client IP, not per account, so an attacker cannot lock a victim out by guessing their password, but a distributed attack is only slowed, not stopped. Passwords are hashed with scrypt.
- **Last admin cannot be removed.** Role changes and self-deletion are serialised with an advisory lock and a database trigger (`drizzle/0002_keep_one_admin.sql`) refuses to leave zero admins.
- **Edits during review.** A moderator's decision carries the version of the text they opened; if the author edited meanwhile the decision is refused with a conflict.
- **Banned authors' existing posts stay public** until a moderator removes them (a ban stops new activity, not history). Decide whether you want automatic hiding.
- **Rate-limit keys are keyed hashes** of IPs and e-mail addresses, and expired sessions, tokens and counters are pruned opportunistically (about 1% of requests) and by `npm run retention:purge`.
- **Pool errors** from idle Neon connections are logged, not fatal. Neon behaviour itself is unverified until a real branch is tested.

## Privacy by design

- Public identity is a chosen display name only. E-mail is never shown to members.
- User-generated pages (`/community`, post pages, profiles) are `noindex` by default because members include
  13-year-olds. To allow indexing, change `robots` in `app/(platform)/(public)/community/(feed)/page.tsx`,
  `community/[id]/page.tsx` and `u/[id]/page.tsx`.
- Self-service deletion removes the account and everything it owns. Rejected posts are purged after 30 days
  (`npm run retention:purge`, run deliberately).
- Moderation and audit records are kept after deletion but hold only ids, roles and moderator notes.
- **The Privacy Policy and Terms were updated to match, but they are drafts that need human legal review** (Singapore
  PDPA; processing of minors' data; the retention periods; the stated sub-processors Vercel, Neon and Resend).

## Reporting a vulnerability

See the repository's `SECURITY.md`.

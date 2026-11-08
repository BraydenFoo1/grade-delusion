# Authentication setup

Built on **Better Auth** (`lib/auth/create.ts`). Email + password only, e-mail verification required.

## What users get

- Register (display name, e-mail, password ≥ 10 chars, "I'm 13 or older", accept Terms) → confirmation e-mail →
  signed in after clicking the link.
- **No session exists until the e-mail is confirmed.** Trying to sign in earlier is refused and sends a fresh link.
- Sign in / out, password reset by e-mail (link valid 1 hour, single use; resetting signs out every device), change
  password, see and revoke signed-in devices, delete the account (needs the password).
- Roles `user`, `moderator`, `admin`, held on the `user` row. Only server code changes them.
- Suspension (timed, ≤ 90 days) and permanent bans. Suspending ends every session immediately; a timed suspension
  lapses by itself.

## How it is locked down

| Concern | What the code does |
|---|---|
| Registration | Better Auth's `/sign-up/email` HTTP route is **disabled**. All sign-ups go through `signUpAction`: honeypot, "registration open" switch, IP rate limit (6/hour), per-address limit (3/hour), display-name rules, 13+ and terms. |
| Account enumeration | Signing up with an existing address looks identical to a new one (the owner gets an e-mail instead). Wrong password and unknown account give the same error. Password-reset requests always answer the same. E-mail is sent in the background, so timing doesn't leak either. |
| Privilege escalation | `role`, `banned`, `banReason`, `banExpires` are `input: false` (clients can't set them). `/update-user` and every `/admin/*` HTTP route of the admin plugin are **disabled**: roles and bans change only through our services, which re-check the actor's role on every call. A member can never grant themselves anything. |
| Sessions | HttpOnly, SameSite=Lax cookies (`Secure` in production), 14-day expiry, **no cookie cache**: bans and role changes apply on the very next request. |
| CSRF | Better Auth's origin check and Fetch-Metadata check are pinned **on** (it skips them when `NODE_ENV=test`, so they're set explicitly). Next.js server actions also verify the request origin. |
| Rate limits | Better Auth's limiter, stored in the database (shared across serverless instances): sign-in 10/min, reset and verification mail 5 per 10 min, etc. Application actions have their own limits (see `ADMIN.md` → Settings). |
| Last admin | An admin can't change their own role or delete their account if they are the only admin. |
| Telemetry | Off. |
| `dash()` / `@better-auth/infra` | **Not installed.** (That plugin exposes full-database admin endpoints when an API key is set. Don't add it without a deliberate decision.) |

## Creating the first admin

The very first admin can't be created from inside the app (that would be a back door). Do it once, deliberately:

1. Sign up normally in the app and click the confirmation link.
2. Promote that account from your machine. **Locally, stop `npm run dev` first** (the embedded database is
   single-process; the command refuses with a clear message if another process has it open, then start dev again):

   ```bash
   # Local:
   npm run admin:promote -- you@example.com
   # Production database (needs your explicit decision):
   DATABASE_URL="postgres://…" npm run admin:promote -- you@example.com --confirm <host>
   ```

3. The change is written to the audit log. From then on, admins manage roles in **Admin → Users → the person → Role**.

## E-mail (needs you: an external account)

1. Create a Resend account, and add + verify a **domain you own** (SPF and DKIM DNS records). Resend can't send from
   `*.vercel.app`, and its shared test sender only reaches your own address.
2. Create an API key; set `RESEND_API_KEY` and `EMAIL_FROM` in Vercel.
3. After deploying, sign up with a real address and confirm the message arrives (check spam the first time).

## Changing auth behaviour

All options are in `lib/auth/create.ts` with comments explaining each security decision. The integration tests in
`tests/auth/auth.test.ts` run the real library against a real Postgres engine; run `npm test` after any change.

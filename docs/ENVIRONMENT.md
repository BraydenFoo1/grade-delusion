# Environment variables

All configuration is through environment variables. Secrets live **only** in `.env.local` (git-ignored) and in
Vercel's environment settings, never in the repository. `.env.example` lists every variable with comments.

## Local development needs none

Run `npm run dev` with no `.env.local` at all and everything works:

- the database is an embedded Postgres (PGlite) stored in `.data/pglite`;
- e-mails (confirmation and password-reset links) are written to `.data/outbox/*.json` and printed in the
  terminal, so you can click the link without any e-mail service;
- a clearly-labelled development secret is used for signing sessions.

`.data/` ignores itself (it contains its own `.gitignore`), so none of it can be committed.

## Variables

| Variable | Required where | What it is |
|---|---|---|
| `DATABASE_URL` | **Production, Preview** | Neon **pooled** connection string (host contains `-pooler`), `sslmode=require`. If set locally, the app uses it instead of the embedded database (and prints a warning). |
| `BETTER_AUTH_SECRET` | **Production, Preview** | 32+ random characters. Signs sessions and tokens. `openssl rand -base64 32`. The app **refuses to run auth** in production without it (it throws on the first auth request, not at build or startup). Changing it signs everyone out. |
| `BETTER_AUTH_URL` | **Production** | Public URL of the deployment, no trailing slash. Used in e-mail links and for the origin check. On Vercel previews it falls back to `https://$VERCEL_URL`. |
| `RESEND_API_KEY` | **Production, Preview** | Resend API key. **Production refuses to start auth without it** (first auth request fails with a clear log message), so a deployment that can't send e-mail never accepts sign-ups. |
| `EMAIL_FROM` | **Production, Preview** | Sender, e.g. `Grade Delusion <no-reply@your-domain>`. The domain must be verified in Resend. **Required in production** (no default there): Resend's sandbox sender only delivers to your own account address, so it would silently drop every member's e-mail. Must look like `Name <a@b.c>` or `a@b.c`. |
| `VERCEL_ENV`, `VERCEL_URL` | Set by Vercel | Read-only. `VERCEL_URL` is the per-deployment host and is used for **Preview** links only. On **Production** (`VERCEL_ENV=production`) `BETTER_AUTH_URL` is mandatory and the first auth request fails without it. |
| `NEXT_PUBLIC_SITE_URL` | Optional | Alternative to `BETTER_AUTH_URL` for the public site URL (`BETTER_AUTH_URL` wins if both are set). |
| `AUTH_TRUSTED_ORIGINS` | Optional | Comma-separated extra origins allowed to call the auth API (e.g. a custom domain). |
| `GD_RATE_LIMIT` | Optional | `1` turns Better Auth's built-in limiter on in development. It is always on in production. |
| `GD_PGLITE_DIR`, `GD_OUTBOX_DIR` | Optional | Where the local database / e-mail outbox live. `GD_PGLITE_DIR=memory://` gives a throw-away database. |
| `GD_LOCAL` | Never on a deployment | `1` lets a **production build** use the local fallbacks on your machine (the end-to-end tests do). It is ignored when Vercel's own `VERCEL` variable is present. |

## Where each value goes

| Value | `.env.local` (your machine) | Vercel Preview | Vercel Production |
|---|---|---|---|
| `DATABASE_URL` | optional (a **Neon dev branch**, never production) | Neon *preview* branch | Neon *production* branch |
| `BETTER_AUTH_SECRET` | not needed | its own random value | its own, different random value |
| `BETTER_AUTH_URL` | not needed | leave unset (uses `VERCEL_URL`) | your production URL |
| `RESEND_API_KEY`, `EMAIL_FROM` | not needed | yes | yes |

## Safety rules the code enforces

- Production **throws on first use** (not at build time) if `DATABASE_URL` or `BETTER_AUTH_SECRET` is missing, rather than silently falling
  back to something insecure.
- Tests blank `DATABASE_URL` and `RESEND_API_KEY`, so a developer's `.env.local` can never point them at a real
  database or send real e-mail.
- Command-line scripts never read `.env.local` on their own. If `DATABASE_URL` is a remote database they refuse to do
  anything until you repeat the host with `--confirm <host>`.

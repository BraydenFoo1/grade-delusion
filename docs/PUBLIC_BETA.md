# Public beta

The public beta is a **read-only** release: the marketing site, the memes and tools, the legal pages, and a community
page that says **"Community is opening soon"**. There are no accounts, no sign-up, no posting, commenting, reacting or
reporting, and no member content.

## How it is enforced

`lib/platform/mode.ts` → `isPublicBeta()` is **true for every deployed build** (production, Vercel previews, self-hosted).

- There is **no environment variable and no database setting** that turns the full platform on in a deployed build.
  (`registrationOpen`, `submissionsOpen` and friends in the database are *not* the release gate: they default to open.)
- The full platform exists only in `next dev`, in tests, and in the local end-to-end build (`GD_LOCAL=1`, never on Vercel,
  and only when `BETTER_AUTH_URL` is a loopback address).
- Enabling accounts on a deployed site later is a **reviewed code change** that also needs the Kai age-assurance gate.

| Surface | Public beta behaviour |
|---|---|
| `/`, memes, generator, quiz, blog, `/privacy`, `/terms`, `sitemap.xml`, `robots.txt` | Open |
| `/community` | Open: static content from `lib/beta/content.ts` (empty → "Community is opening soon") |
| `/community/[id]`, `/u/[id]` | Open for static content; 404 when there is none |
| `GET /api/community/posts` | Open: serves the same static feed |
| Everything in `app/(platform)/(private)` (sign-in, sign-up, dashboard, submit, settings, admin, …) | 404 |
| `/api/auth/*` (Better Auth), `/api/notifications/unread` | 404 |
| Every server action (`app/actions/*`): sign-up, posting, comments, reactions, reports, profile, admin | Refused (`UNAVAILABLE`) before any auth or database work |
| Database, sessions, e-mail | Never touched. No `DATABASE_URL`, `BETTER_AUTH_*` or `RESEND_*` is needed |

Security headers (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`) and the `noindex` rules for private paths are unchanged.

## Content

Beta content is static, reviewed and team-written, in `lib/beta/content.ts`. It ships **empty on purpose**. Never put
members' content there: those accounts were created before age assurance existed. To publish a curated post, add a
`PostView` with `status: "approved"` and have it reviewed like any release.

## Legal wording

The public-beta notices for `/privacy` and `/terms` are **drafts**. They are hidden while `legal.betaWordingApproved`
(`lib/site.ts`) is `false`, so the pages render exactly as before. Flip it only after the wording has been reviewed by a
qualified person, update `legal.lastUpdated`, and update the test that pins the flag. Nothing here claims legal compliance.

## Checking it

```bash
npm run typecheck && npm test            # unit tests, including tests/unit/public-beta.test.ts
npm run build && npm run test:public-beta   # a real production build with no database, secrets or e-mail:
                                            # scripts/public-beta-smoke.mjs checks what is open, what is 404,
                                            # that no participation controls render, and the security headers
```

## Deploying

Do **not** merge this branch into `main` or promote it to production without explicit approval. Push it only to get a
**Preview** deployment (behind Vercel's deployment protection) and check Vercel's *Production Branch*, domains and
environment variables first. See `DEPLOYMENT.md`.

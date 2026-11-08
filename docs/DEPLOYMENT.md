# Deployment preparation

> **Public beta first.** The first release is the read-only public beta described in [`PUBLIC_BETA.md`](./PUBLIC_BETA.md):
> no accounts, no database, no e-mail. The sections below (Neon, Resend, migrations, sign-up smoke tests) apply to the
> **full platform** and are not needed for the beta. A deployed build is always the public beta; enabling accounts later is
> a reviewed code change plus the Kai age gate, not a setting.

**Nothing in this branch has been deployed, pushed or committed.** This is the checklist for when you decide to.

## 0. Decisions that are yours

- [ ] **A domain you own** (for e-mail sending). Resend can't send from `*.vercel.app`.
- [ ] **Vercel plan.** Hobby is for non-commercial use; a site tied to a business may need Pro. Check Vercel's terms.
- [ ] **Legal review** of the updated Privacy Policy and Terms (they contain the 13+ rule, retention and sub-processors).
- [ ] **Who moderates, and how often.** Every post waits for a human. Decide the review cadence before launch.
- [ ] Whether user-generated pages should be indexed by search engines (default: no, see `SECURITY.md`).

## 1. Accounts to create (external services)

1. **Neon**: project, branches `production` and `preview` (see `DATABASE.md`).
2. **Resend**: verify your domain, create an API key (see `AUTHENTICATION.md`).
3. **Vercel**: set the environment variables from `ENVIRONMENT.md` for *Preview* and *Production* separately.

## 2. Before the first deploy

- [ ] `npm ci && npm run typecheck && npm test` pass.
- [ ] `npm run build` passes, then `npm run test:e2e` (builds nothing itself; run the build first).
- [ ] Review the SQL in `drizzle/`.
- [ ] Apply migrations to the **preview** Neon branch: `DATABASE_URL=… npm run db:migrate -- --confirm <host>`.
- [ ] Deploy a **Preview** and click through: sign up (real e-mail arrives), submit, approve, report, sign out/in,
      reset a password, delete a throwaway account. Previews send `X-Robots-Tag: noindex` and may require a Vercel login.

## 3. Going to production (each step is a separate, deliberate action)

1. Apply migrations to the **production** branch: `DATABASE_URL=… npm run db:migrate -- --confirm <host>`.
2. Merge / deploy.
3. Create the first admin (see `AUTHENTICATION.md`).
4. Smoke test on production (same list as Preview).
5. Check Vercel → **Firewall / bot protection** isn't blocking legitimate traffic or the e-mail links.
6. Search Console: re-fetch `robots.txt`; confirm `/admin`, `/dashboard`, etc. are `noindex` (they send `X-Robots-Tag`).

## 4. Existing Git state (not touched by this work)

The earlier crawler-policy / SEO / generator changes are still **uncommitted** on this machine, `main` still differs
from GitHub's `main`, and production's robots tags are still the old lockdown (`nofollow, noarchive, nocache`,
`data-nosnippet`). This feature branch contains those uncommitted files as they were, plus the new work, so
**resolve the earlier release plan first** (or deliberately ship everything together). Do not merge this branch to
`main` without reconciling with GitHub's `0743207` robots change.

### Things to verify on a Preview deployment before Production
- **E-mail failures are only logged.** Members see "check your e-mail" even if Resend rejects the send. Check the Resend dashboard and Vercel function logs after your first sign-up; confirm the sender domain is verified and links point at the right host.
- **Origins.** `BETTER_AUTH_URL` must be set on Production. Vercel's own production and branch hosts are trusted automatically; add any custom domain or `www` alias to `AUTH_TRUSTED_ORIGINS`.
- **Node.** `package.json` requires Node 22+ (the Neon driver needs global `WebSocket`); keep the Vercel project on Node 22 or later.
- **Neon.** Run `npm run db:migrate` against a Neon *branch* first, then sign up, post, moderate and demote an admin to exercise transactions and advisory locks through the pooled host.

## 5. Operating it

- Watch the review queue and open reports (the dashboard and admin badges show counts).
- Run `npm run retention:purge` (preview first) periodically.
- Rotate `BETTER_AUTH_SECRET` if it leaks (signs everyone out).
- Keep dependencies patched; `npm audit` and the Next.js security advisories matter for server actions.

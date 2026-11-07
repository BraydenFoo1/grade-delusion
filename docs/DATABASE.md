# Database setup

Stack: **Postgres** (Neon in production, an embedded PGlite database locally), **Drizzle ORM** for the schema and
migrations. The schema is in `lib/db/schema.ts`; the SQL migrations are in `drizzle/` and are committed.

## Local development

Nothing to set up. The first request creates `.data/pglite/` and applies every migration.

The embedded database is **single-process**: only one process may have `.data/pglite` open. A lock file
(`.data/pglite.lock`, holding the owner's PID) makes `npm run db:migrate`, `admin:promote`, `retention:purge` and
`db:reset-local` refuse, with an explanation, while `npm run dev` is running. Stop the dev server first. (A stale
lock from a crashed process is ignored automatically.) Neon/Postgres has no such restriction.

To start over:

```bash
npm run db:reset-local -- --yes     # deletes .data/pglite (refuses if DATABASE_URL is set)
```

## Creating a Neon database (needs you: an external account)

1. Sign in at neon.tech, create a project, choose a region near Singapore (e.g. AWS ap-southeast-1).
2. Create two **branches**: `production` and `preview` (Neon branches are cheap, instant copies). Never point
   Preview or local development at the production branch.
3. For each branch copy the **pooled** connection string (host contains `-pooler`) into the matching Vercel
   environment variable `DATABASE_URL` (see `ENVIRONMENT.md`).
4. Apply the migrations to each branch (below).

## Migrations

Migrations are plain SQL files, applied in order, recorded in a `drizzle` schema so re-running is safe. They are
**never run automatically on deploy**: running one against production is a deliberate act.

```bash
npm run db:migrate                                   # local embedded database
DATABASE_URL="postgres://…" npm run db:migrate -- --confirm <host>   # remote: you must repeat the host name
```

Read the files in `drizzle/` before applying them. To change the schema: edit `lib/db/schema.ts`, run
`npm run db:generate -- --name=what_changed`, **review the generated SQL**, commit it, then migrate each environment.
Never edit a migration that has already been applied anywhere.

| File | What it does |
|---|---|
| `0000_initial.sql` | All tables, indexes, foreign keys and CHECK constraints |
| `0001_append_only_history.sql` | A trigger that makes `audit_log` and `moderation_action` refuse `UPDATE` and `DELETE` |
| `0002_keep_one_admin.sql` | A trigger that refuses to demote or delete the **last admin** (lockout protection, race-proof) |

## Schema

Better Auth tables: `user`, `session`, `account`, `verification`, `rate_limit`.
`user` also carries `role` (`user` / `moderator` / `admin`), the ban fields, `bio`, and the consent timestamps.

Application tables:

| Table | Purpose | Notable constraints |
|---|---|---|
| `post` | A submitted delusion | `status` ∈ pending/approved/rejected/removed (default **pending**); body 1–500 chars; category check; author FK `ON DELETE CASCADE`; indexes on (status, published) and (author, created) |
| `comment` | Comment or reply (one level of nesting) | body 1–300; post FK cascade; self-reference for replies |
| `reaction` | One reaction per user per post | primary key (post, user); kind check |
| `notification` | In-app notifications | partial index on unread |
| `report` | A report of a post or comment | **exactly one** of post/comment (CHECK); **partial unique index**: one *open* report per reporter per target; keeps a snapshot of the reported text |
| `moderation_action` | Every moderator decision | append-only (trigger); no foreign keys, so history outlives accounts |
| `audit_log` | Security-relevant actions | append-only (trigger); no foreign keys |
| `site_setting` | Platform configuration (JSON per key) | |
| `app_rate_limit` | Fixed-window counters for posts, comments, reports, reactions, sign-ups | one atomic upsert per check |

Deleting a user cascades to their posts, comments, reactions and notifications. Their reports are kept (reporter set
to null) so moderators don't lose evidence. Moderation/audit rows are never touched.

## Retention of rejected posts

Rejected posts are kept for **30 days** after the decision, then deleted together with their comments, reactions,
notifications and reports. This is **not scheduled**. Run it deliberately:

```bash
npm run retention:purge                 # preview: counts what would be deleted, deletes nothing
npm run retention:purge -- --delete     # really delete (add --confirm <host> for a remote database)
```

Each run is recorded in the audit log. Turning it into a daily Vercel Cron job is a separate decision.

## Backups

Neon keeps point-in-time history on its paid plans; the free plan has a short window. Decide your recovery needs
before launch. The audit log and moderation history are in the same database, so they share its backups.

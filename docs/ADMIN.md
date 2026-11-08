# Admin and moderation guide

The admin area is at `/admin` (staff only: anyone else, signed in or not, gets a 404 or a sign-in redirect).
Every page and every action re-checks the role **on the server**; hiding a button is only convenience.

## Roles

| | Member | Moderator | Admin |
|---|:-:|:-:|:-:|
| Post, comment, react, report (verified, not suspended) | ✓ | ✓ | ✓ |
| Review queue: approve / reject posts | | ✓ | ✓ |
| Remove / restore posts and comments | | ✓ | ✓ |
| Handle reports | | ✓ | ✓ |
| Suspend / ban / restore **members** | | ✓ | ✓ |
| Suspend / ban / restore **moderators** | | | ✓ |
| See full e-mail addresses, search by e-mail | | | ✓ (moderators see `j•••@school.edu`) |
| Change roles | | | ✓ |
| Audit log, platform settings, moderator list | | | ✓ |

Rules the services enforce regardless of the UI: nobody can act on an admin or on themselves; admins can't change
their own role; a moderator can't decide on **their own** post, comment or reports about their own content (another
moderator or an admin has to).

## Sections

- **Overview**: what needs attention (queue size, oldest waiting post, open reports), a 14-day chart of sign-ups,
  submissions and approvals (with a table view), and plain totals.
- **Review queue**: pending posts, oldest first. *Approve* publishes. *Not approved…* offers one-tap reasons and a
  note; the author is notified and sees the note. A short pause shows your confirmation before the list refreshes.
- **Reports**: open reports show the reported text exactly as it was when reported. *Remove content…*, *Reviewed, no
  action* or *Dismiss* closes **every** open report on that content at once and tells the reporters.
- **Posts / Comments**: search and filter everything; remove live items, restore removed ones.
- **Users**: search (name; admins also e-mail), filter by role and state. A user's page shows counts, recent posts,
  the moderation history about them, and the suspend / ban / restore and role controls.
- **Moderators** (admin): who has access.
- **Audit log** (admin): moderation decisions, role changes, settings changes, account deletions and retention runs,
  with filters. The database itself refuses edits and deletes to this table.
- **Settings** (admin): see below.

## Platform settings

| Setting | Default | Effect |
|---|---|---|
| Sign-ups open | on | Off stops new accounts |
| Submissions open | on | Off pauses new posts (members see why) |
| Comments open | on | Off pauses comments and replies |
| Allow links | off | Off rejects links and e-mail addresses as spam |
| Posts / comments / reports per member per day | 5 / 40 / 20 | Daily caps |
| Seconds between posts / comments | 30 / 10 | Burst cooldowns |
| Blocked words and phrases | empty | Rejected in posts, comments, names, bios (matching ignores case and common swaps like `4`→`a`; the rejection never reveals the word) |
| Site announcement | empty | Banner on every community page |

Every change is validated and audited (only the *names* of changed settings are logged, not their contents).

## Spam and abuse protection (what is automatic)

Content is normalised (invisible/bidi characters stripped), then rejected if it contains a link or address, repeated
characters/words, or a blocked term; identical text within 24 h is refused; per-user daily caps and cooldowns apply
to posts, comments, reports and reactions; sign-ups have a honeypot and rate limits. All of this is covered by tests.

## Retention

Rejected posts are deleted 30 days after the decision **only when you run** `npm run retention:purge -- --delete`
(preview first without `--delete`). See `DATABASE.md`.

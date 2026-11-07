// Retention: delete rejected posts older than 30 days (see lib/services/retention.ts and docs/SECURITY.md).
//
//   Preview (default, deletes nothing):  npm run retention:purge
//   Really delete:                        npm run retention:purge -- --delete
//   Remote:  DATABASE_URL="postgres://..." npm run retention:purge -- --delete --confirm <host>
//
// Deliberately NOT scheduled. Moving this to a cron job is a separate decision.

import { connectDb } from "../lib/db/connect";
import { REJECTED_RETENTION_DAYS } from "../lib/platform/constants";
import { purgeRejectedPosts } from "../lib/services/retention";
import { flag, requireConfirmedTarget } from "./_guard";

const dryRun = !flag("--delete");
const target = requireConfirmedTarget(dryRun ? "preview a purge" : "delete rejected posts");

async function main() {
  const { db, close } = await connectDb();
  try {
    const res = await purgeRejectedPosts(db, { dryRun });
    console.log(
      dryRun
        ? `Preview on ${target}: ${res.candidates} rejected post(s) older than ${REJECTED_RETENTION_DAYS} days would be deleted. Nothing was changed. Add --delete to delete them.`
        : `Deleted ${res.deleted} rejected post(s) older than ${REJECTED_RETENTION_DAYS} days on ${target}.`,
    );
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

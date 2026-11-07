// Wipe the LOCAL development database (.data/pglite) and start fresh.
//
//   npm run db:reset-local -- --yes
//
// Refuses to run if DATABASE_URL is set (so it can never touch a remote database) and needs --yes.

import { rmSync } from "node:fs";
import path from "node:path";
import { databaseUrl, pgliteDir } from "../lib/env";
import { flag } from "./_guard";

if (databaseUrl()) {
  console.error("DATABASE_URL is set: this script only resets the local embedded database. Unset it and try again.");
  process.exit(2);
}
if (!flag("--yes")) {
  console.error("This deletes every account, post and comment in the LOCAL development database. Re-run with --yes to confirm.");
  process.exit(2);
}
const dir = path.resolve(process.cwd(), pgliteDir());
// Only ever delete inside this project's .data folder.
if (!dir.startsWith(path.resolve(process.cwd(), ".data") + path.sep)) {
  console.error(`Refusing to delete ${dir}: it is outside .data/.`);
  process.exit(2);
}
rmSync(dir, { recursive: true, force: true });
console.log(`Deleted ${path.relative(process.cwd(), dir)}. The next run of the app creates a fresh database.`);

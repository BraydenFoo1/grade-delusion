// Apply the SQL migrations in /drizzle.
//
//   Local database:   npm run db:migrate
//   Remote (Neon):    DATABASE_URL="postgres://..." npm run db:migrate -- --confirm <host>
//
// Migrations are never run automatically on deploy. Run this deliberately, and only after reviewing the
// files in /drizzle. Applied migrations are recorded in the "drizzle" schema, so re-running is safe.

import path from "node:path";
import { databaseUrl } from "../lib/env";
import { requireConfirmedTarget } from "./_guard";

const target = requireConfirmedTarget("run migrations");
const folder = path.resolve(process.cwd(), "drizzle");

async function main() {
  console.log(`Applying migrations from ${path.relative(process.cwd(), folder)}/ to ${target}…`);
  const url = databaseUrl();
  if (url) {
    const { Pool, neonConfig } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const { migrate } = await import("drizzle-orm/neon-serverless/migrator");
    if (typeof WebSocket !== "undefined") neonConfig.webSocketConstructor = WebSocket;
    const pool = new Pool({ connectionString: url });
    await migrate(drizzle(pool), { migrationsFolder: folder });
    await pool.end();
  } else {
    // openPglite applies the migrations as part of opening the database.
    const { openPglite } = await import("../lib/db/pglite");
    const { pgliteDir } = await import("../lib/env");
    const { close } = await openPglite(pgliteDir());
    await close();
  }
  console.log("Done. The database is up to date.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

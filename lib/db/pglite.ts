// PGlite (Postgres compiled to WebAssembly) powers local development and the test suite, so the
// app runs with no external database. It is never used in production (see client.ts).

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { ensureDataDir } from "./data-dir";
import * as schema from "./schema";

export type PgliteDb = ReturnType<typeof createPgliteDrizzle>;

function createPgliteDrizzle(client: PGlite) {
  return drizzle(client, { schema });
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM"; // exists, but not ours to signal
  }
}

/**
 * PGlite is a single-process database and keeps no lock of its own: two processes opening the same folder
 * (say `npm run dev` and `npm run admin:promote`) can corrupt it or silently miss each other's writes.
 * This writes `<dir>.lock` holding our PID and refuses to open a folder another live process holds.
 */
function acquireLock(dataDir: string): () => void {
  const lock = `${dataDir}.lock`;
  if (existsSync(lock)) {
    const pid = Number(readFileSync(lock, "utf8").trim());
    if (pid && pid !== process.pid && isAlive(pid)) {
      throw new Error(
        `The local database ${path.relative(process.cwd(), dataDir)} is already open in another process (PID ${pid}), ` +
          `most likely "npm run dev". The embedded database supports one process at a time, so stop that process first. ` +
          `(If you're sure nothing is using it, delete ${path.relative(process.cwd(), lock)}.)`,
      );
    }
  }
  writeFileSync(lock, String(process.pid));
  const release = () => {
    try {
      if (existsSync(lock) && Number(readFileSync(lock, "utf8").trim()) === process.pid) rmSync(lock);
    } catch {
      /* already gone */
    }
  };
  process.once("exit", release);
  return release;
}

/**
 * Open a PGlite database and bring it up to date with the SQL migrations in /drizzle.
 * `location` is a directory path, or `memory://` for a throw-away database.
 */
export async function openPglite(location: string): Promise<{ db: PgliteDb; close: () => Promise<void> }> {
  let dataDir = location;
  let release = () => {};
  if (location !== "memory://") {
    ensureDataDir();
    dataDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), location);
    mkdirSync(path.dirname(dataDir), { recursive: true });
    release = acquireLock(dataDir);
  }
  try {
    const client = new PGlite(dataDir);
    await client.waitReady;
    const db = createPgliteDrizzle(client);
    await migrate(db, { migrationsFolder: path.resolve(/*turbopackIgnore: true*/ process.cwd(), "drizzle") });
    return {
      db,
      close: async () => {
        await client.close();
        release();
      },
    };
  } catch (err) {
    release();
    throw err;
  }
}

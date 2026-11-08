import "server-only";

import { connectDb } from "./connect";
import type { AppDb } from "./types";

export type { AppDb, Db } from "./types";

const globalForDb = globalThis as unknown as { __gradeDelusionDb?: Promise<AppDb> };

/** Lazily connects on first use and shares one connection per server process. */
export function getDb(): Promise<AppDb> {
  globalForDb.__gradeDelusionDb ??= connectDb()
    .then((c) => c.db)
    .catch((err) => {
      globalForDb.__gradeDelusionDb = undefined; // allow a retry on the next request
      throw err;
    });
  return globalForDb.__gradeDelusionDb;
}

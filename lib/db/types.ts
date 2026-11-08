import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/**
 * The database type every service accepts. It is satisfied by both drivers (Neon in production,
 * PGlite locally and in tests), which is what lets the services be tested without Next.js.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppDb = PgDatabase<any, typeof schema>;

/** Either the database or an open transaction; use for helpers that run inside someone else's transaction. */
export type Db = Pick<AppDb, "select" | "insert" | "update" | "delete" | "execute">;

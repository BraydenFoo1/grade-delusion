// Opens the database. Shared by the app (via client.ts, which adds `server-only` and caching) and by the
// command-line scripts in /scripts, which can't import `server-only`.

import { databaseUrl, isProduction, pgliteDir } from "../env";
import { logUnexpected } from "../platform/errors";
import * as schema from "./schema";
import type { AppDb } from "./types";

export type Connection = { db: AppDb; close: () => Promise<void>; kind: "neon" | "pglite"; host: string };

export async function connectDb(): Promise<Connection> {
  const url = databaseUrl();

  if (url) {
    // Neon over WebSockets: supports real transactions (the HTTP driver doesn't).
    const { Pool, neonConfig } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    if (typeof WebSocket !== "undefined") neonConfig.webSocketConstructor = WebSocket;
    const host = new URL(url).host;
    if (!isProduction()) console.warn(`[db] Using remote database ${host}. Unset DATABASE_URL to use the local PGlite database.`);
    const pool = new Pool({ connectionString: url });
    // Neon drops idle connections. Without a listener, an idle-client error is an unhandled 'error' event
    // that crashes the function instance.
    pool.on("error", (e: unknown) => logUnexpected("[db] idle client error:", e));
    return { db: drizzle(pool, { schema }) as unknown as AppDb, close: () => pool.end(), kind: "neon", host };
  }

  if (isProduction()) {
    throw new Error("DATABASE_URL is required in production. See docs/ENVIRONMENT.md.");
  }

  // Development fallback: an embedded Postgres in .data/. Never reachable in production.
  if (process.env.NODE_ENV === "production") {
    console.warn("[db] GD_LOCAL=1: running a production build against the local embedded database. Never do this on a real deployment.");
  }
  const { openPglite } = await import("./pglite");
  const { db, close } = await openPglite(pgliteDir());
  return { db: db as unknown as AppDb, close, kind: "pglite", host: `local:${pgliteDir()}` };
}

import "server-only";

import { actorOrThrow } from "../auth/session";
import { getDb } from "../db/client";
import type { AppDb } from "../db/types";
import type { Actor } from "../platform/actor";
import { type ActionResult, fail, ok } from "../platform/errors";

type Level = "user" | "participant" | "staff" | "admin";

/**
 * Run a server action body as the signed-in user.
 *  - "user": any signed-in account (e.g. deleting your own content, reading notifications)
 *  - "participant": verified and not suspended (anything that publishes)
 *  - "staff" / "admin": checked again here, on the server, for every single call
 * Expected failures become `{ ok: false }` with a safe message; anything unexpected is logged and
 * returned as a generic error so internals never reach the browser.
 */
export async function run<T>(level: Level, fn: (ctx: { db: AppDb; actor: Actor }) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const actor = await actorOrThrow(level);
    const db = await getDb();
    return ok(await fn({ db, actor }));
  } catch (err) {
    // redirect()/notFound() work by throwing; let those through untouched.
    const digest = (err as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR"))) throw err;
    return fail(err);
  }
}

/** The caller's IP as seen by the platform proxy (Vercel overwrites x-forwarded-for). */
export function clientIp(h: Headers): string {
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim().slice(0, 64);
}

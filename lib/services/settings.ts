import { sql } from "drizzle-orm";
import type { AppDb, Db } from "@/lib/db/types";
import { siteSetting } from "@/lib/db/schema";
import { assertAdmin, type Actor } from "@/lib/platform/actor";
import { type Settings, settingsSchema, parse } from "@/lib/platform/validation";
import { recordAudit } from "./audit";

/** Current platform configuration. Missing or invalid rows fall back to safe defaults. */
export async function getSettings(db: Db): Promise<Settings> {
  const rows = await db.select().from(siteSetting);
  const raw = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const parsed = settingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : settingsSchema.parse({});
}

/** Admin only. The merged result is validated as a whole before anything is written. */
export async function updateSettings(db: AppDb, actor: Actor, patch: unknown): Promise<Settings> {
  assertAdmin(actor);
  return db.transaction(async (tx) => {
    const current = await getSettings(tx);
    const next = parse(settingsSchema, { ...current, ...(patch as object) });
    const changed = (Object.keys(next) as (keyof Settings)[]).filter((k) => JSON.stringify(next[k]) !== JSON.stringify(current[k]));
    for (const key of changed) {
      await tx
        .insert(siteSetting)
        .values({ key, value: next[key], updatedById: actor.id })
        .onConflictDoUpdate({ target: siteSetting.key, set: { value: next[key], updatedById: actor.id, updatedAt: sql`now()` } });
    }
    if (changed.length > 0) {
      await recordAudit(tx, {
        actor,
        action: "settings.updated",
        targetType: "settings",
        // Keys only: the blocked-term list and announcement text stay out of the audit trail.
        details: { changed },
      });
    }
    return next;
  });
}

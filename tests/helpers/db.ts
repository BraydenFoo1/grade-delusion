import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { openPglite, type PgliteDb } from "@/lib/db/pglite";
import * as schema from "@/lib/db/schema";
import type { Role } from "@/lib/platform/constants";
import type { Actor } from "@/lib/platform/actor";

export type TestDb = PgliteDb;

/** A fresh in-memory Postgres with every migration applied. Call `close()` in afterAll. */
export async function createTestDb() {
  const { db, close } = await openPglite("memory://");
  return { db, close };
}

/** Insert a user directly (bypasses Better Auth: fast, for service-level tests). */
export async function makeUser(
  db: TestDb,
  overrides: Partial<typeof schema.user.$inferInsert> & { role?: Role } = {},
): Promise<Actor> {
  const id = overrides.id ?? randomUUID();
  const [row] = await db
    .insert(schema.user)
    .values({
      id,
      name: overrides.name ?? `User ${id.slice(0, 6)}`,
      email: overrides.email ?? `${id}@example.test`,
      emailVerified: overrides.emailVerified ?? true,
      role: overrides.role ?? "user",
      banned: overrides.banned ?? false,
      banExpires: overrides.banExpires ?? null,
      ageConfirmedAt: new Date(),
      termsAcceptedAt: new Date(),
    })
    .returning();
  return {
    id: row.id,
    name: row.name,
    role: (row.role as Role) ?? "user",
    emailVerified: row.emailVerified,
    banned: row.banned,
    banExpires: row.banExpires,
  };
}

/** Wipe every table between tests that need a clean slate (history tables are append-only, so recreate them). */
export async function resetDb(db: TestDb) {
  await db.execute(sql`drop trigger if exists audit_log_append_only on audit_log`);
  await db.execute(sql`drop trigger if exists moderation_action_append_only on moderation_action`);
  await db.execute(
    sql`truncate table "user", audit_log, moderation_action, site_setting, app_rate_limit, rate_limit, verification restart identity cascade`,
  );
  await db.execute(
    sql`create trigger audit_log_append_only before update or delete on audit_log for each row execute function forbid_history_changes()`,
  );
  await db.execute(
    sql`create trigger moderation_action_append_only before update or delete on moderation_action for each row execute function forbid_history_changes()`,
  );
}

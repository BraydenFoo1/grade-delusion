// Prepares the throwaway database the end-to-end tests run against (never used for anything else).
//
// Accounts are created through the REAL Better Auth sign-up (so password hashing and consent fields are the
// real ones), then confirmed and given their role directly in the database, since the app deliberately has
// no way to do that from outside. Runs BEFORE the server starts, so no test-only code exists in the app.

import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { E2E_AUTH_DIR, E2E_OUTBOX, E2E_PASSWORD, E2E_USERS } from "../e2e/constants";
import { createAuth } from "../lib/auth/create";
import { openPglite } from "../lib/db/pglite";
import { siteSetting, user } from "../lib/db/schema";
import type { AppDb } from "../lib/db/types";
import type { Actor } from "../lib/platform/actor";
import { toRole } from "../lib/platform/constants";
import { createPost, moderatePost } from "../lib/services/posts";


const dir = process.env.GD_PGLITE_DIR ?? "";
if (!dir.startsWith(".data/e2e")) {
  console.error("e2e-seed only runs against a .data/e2e* database (set GD_PGLITE_DIR). Refusing.");
  process.exit(2);
}

async function main() {
  // Start from nothing: these directories are this script's own throwaway artefacts.
  for (const d of [dir, process.env.GD_OUTBOX_DIR ?? E2E_OUTBOX, E2E_AUTH_DIR]) rmSync(path.resolve(process.cwd(), d), { recursive: true, force: true });
  mkdirSync(path.resolve(process.cwd(), E2E_AUTH_DIR), { recursive: true });

  const { db, close } = await openPglite(dir);
  const app = db as unknown as AppDb;
  const auth = createAuth({
    db: app,
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3100",
    secret: "e2e-secret-e2e-secret-e2e-secret-123456",
    production: false,
    rateLimitEnabled: false,
    sendMail: () => {},
  });

  const actors: Record<string, Actor> = {};
  for (const u of E2E_USERS) {
    await auth.api.signUpEmail({ body: { name: u.name, email: u.email, password: E2E_PASSWORD } });
    await db.update(user).set({ emailVerified: true, role: u.role }).where(eq(user.email, u.email));
    const [row] = await db.select().from(user).where(eq(user.email, u.email));
    actors[u.key] = { id: row.id, name: row.name, role: toRole(row.role), emailVerified: true, banned: false, banExpires: null };
  }

  // No cooldowns, generous limits: the tests post, comment and report in quick succession.
  for (const [key, value] of Object.entries({ postCooldownSec: 0, commentCooldownSec: 0, dailyPostLimit: 50, dailyCommentLimit: 200, dailyReportLimit: 50 })) {
    await db.insert(siteSetting).values({ key, value });
  }

  // A few live posts so the feed has something to show, filter and paginate.
  const seedPosts = [
    ["exams", "Everyone else didn't study either, so the teacher can't scold the whole class. Confirm plus chop."],
    ["studying", "I own six highlighters, which is basically the same as having studied."],
    ["results", "I only need 4 marks on the final to pass, and the final is worth 100 marks. Easy."],
    ["life", "I will definitely sleep at 10pm tonight and wake up at 5am to revise."],
  ] as const;
  for (const [category, body] of seedPosts) {
    const { id } = await createPost(app, actors.fan, { body, category });
    await moderatePost(app, actors.mod, { id, decision: "approve" });
  }
  // Enough extra live posts to span two pages of the feed (12 per page), so pagination is testable.
  const cats = ["exams", "studying", "results", "life"] as const;
  for (let i = 1; i <= 13; i++) {
    const { id } = await createPost(app, actors.fan, { body: `Seeded filler delusion ${i}: surely this one will definitely work out fine`, category: cats[i % 4] });
    await moderatePost(app, actors.mod, { id, decision: "approve" });
  }
  await close();
  console.log(`[e2e-seed] ready: ${E2E_USERS.length} accounts, ${seedPosts.length + 13} live posts in ${dir}`);
}

main().catch((err) => {
  console.error("[e2e-seed] failed", err);
  process.exit(1);
});

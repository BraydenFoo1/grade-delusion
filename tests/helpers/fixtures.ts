import { siteSetting } from "@/lib/db/schema";
import { createPost, moderatePost } from "@/lib/services/posts";
import type { Actor } from "@/lib/platform/actor";
import type { Settings } from "@/lib/platform/validation";
import type { TestDb } from "./db";

let n = 0;
/** Unique, valid post text every call (the duplicate check would otherwise reject repeats). */
export const uniqueBody = (label = "delusion") => `Test ${label} number ${++n}: I will definitely start studying tomorrow`;

/** Write platform settings directly (admin-only in the real app). Tests default to no cooldowns. */
export async function setSettings(db: TestDb, patch: Partial<Settings>) {
  for (const [key, value] of Object.entries(patch)) {
    await db
      .insert(siteSetting)
      .values({ key, value })
      .onConflictDoUpdate({ target: siteSetting.key, set: { value } });
  }
}

export const noCooldowns = (db: TestDb) => setSettings(db, { postCooldownSec: 0, commentCooldownSec: 0 });

/** Create a post as `author` and approve it as `moderator`. Returns the post id. */
export async function approvedPost(db: TestDb, author: Actor, moderator: Actor, body = uniqueBody(), category = "life") {
  const { id } = await createPost(db, author, { body, category });
  await moderatePost(db, moderator, { id, decision: "approve" });
  return id;
}

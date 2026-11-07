"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/actions/run";
import type { ReactionKey } from "@/lib/platform/constants";
import type { ActionResult } from "@/lib/platform/errors";
import { createComment, deleteOwnComment } from "@/lib/services/comments";
import { markAllRead, markRead } from "@/lib/services/notifications";
import { createPost, deleteOwnPost, updateOwnPost } from "@/lib/services/posts";
import { setReaction } from "@/lib/services/reactions";
import { createReport } from "@/lib/services/reports";

// Every action here is a thin wrapper: authenticate → call the tested service → refresh the pages that show the data.
// Authorisation and validation live in the services, so the browser never gets to decide anything.

export async function submitPostAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const res = await run("participant", ({ db, actor }) => createPost(db, actor, input));
  if (res.ok) {
    revalidatePath("/my-submissions");
    revalidatePath("/dashboard");
  }
  return res;
}

export async function updatePostAction(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const res = await run("participant", ({ db, actor }) => updateOwnPost(db, actor, id, input));
  if (res.ok) {
    revalidatePath("/my-submissions");
    revalidatePath("/community");
  }
  return res;
}

export async function deletePostAction(id: string): Promise<ActionResult> {
  // Deleting your own content is allowed even while suspended.
  const res = await run("user", async ({ db, actor }) => {
    await deleteOwnPost(db, actor, id);
  });
  if (res.ok) {
    revalidatePath("/my-submissions");
    revalidatePath("/community");
    revalidatePath("/dashboard");
  }
  return res;
}

export async function addCommentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const res = await run("participant", ({ db, actor }) => createComment(db, actor, input));
  if (res.ok) revalidatePath("/community/[id]", "page");
  return res;
}

export async function deleteCommentAction(id: string): Promise<ActionResult> {
  const res = await run("user", async ({ db, actor }) => {
    await deleteOwnComment(db, actor, id);
  });
  if (res.ok) revalidatePath("/community/[id]", "page");
  return res;
}

export async function reactAction(input: unknown): Promise<ActionResult<{ counts: Record<ReactionKey, number>; mine: ReactionKey | null }>> {
  return run("participant", ({ db, actor }) => setReaction(db, actor, input));
}

export async function reportAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return run("participant", ({ db, actor }) => createReport(db, actor, input));
}

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const res = await run("user", async ({ db, actor }) => markRead(db, actor.id, id));
  if (res.ok) revalidatePath("/notifications");
  return res;
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const res = await run("user", async ({ db, actor }) => markAllRead(db, actor.id));
  if (res.ok) revalidatePath("/notifications");
  return res;
}

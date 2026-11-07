"use server";

import { run } from "@/lib/actions/run";
import type { ActionResult } from "@/lib/platform/errors";
import { moderateComment } from "@/lib/services/comments";
import { moderatePost } from "@/lib/services/posts";
import { resolveReport } from "@/lib/services/reports";
import { updateSettings } from "@/lib/services/settings";
import { restoreUser, setUserRole, suspendUser } from "@/lib/services/users";

// Staff/admin actions. The role is re-checked by `run("staff" | "admin")` AND again inside each service,
// on every call: hiding a button in the UI is convenience, never security.

// No revalidatePath here on purpose. Every platform page is dynamic (never cached), so there is nothing to
// invalidate, and revalidating makes Next re-render the current page inside the action's own response, which
// would remove a just-decided queue item before the moderator sees the confirmation. The components call
// router.refresh() themselves, when they are ready.

export async function moderatePostAction(input: unknown): Promise<ActionResult<{ id: string; status: string }>> {
  const res = await run("staff", ({ db, actor }) => moderatePost(db, actor, input));
  return res;
}

export async function moderateCommentAction(input: { id: string; decision: "remove" | "restore"; note?: string }): Promise<ActionResult> {
  const res = await run("staff", async ({ db, actor }) => moderateComment(db, actor, input));
  return res;
}

export async function resolveReportAction(input: unknown): Promise<ActionResult> {
  const res = await run("staff", async ({ db, actor }) => resolveReport(db, actor, input));
  return res;
}

export async function suspendUserAction(input: unknown): Promise<ActionResult> {
  const res = await run("staff", async ({ db, actor }) => suspendUser(db, actor, input));
  return res;
}

export async function restoreUserAction(userId: string): Promise<ActionResult> {
  const res = await run("staff", async ({ db, actor }) => restoreUser(db, actor, userId));
  return res;
}

export async function setRoleAction(input: unknown): Promise<ActionResult> {
  const res = await run("admin", async ({ db, actor }) => setUserRole(db, actor, input));
  return res;
}

export async function updateSettingsAction(input: unknown): Promise<ActionResult> {
  const res = await run("admin", async ({ db, actor }) => {
    await updateSettings(db, actor, input);
  });
  return res;
}

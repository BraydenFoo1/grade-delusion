import "server-only";

import { requireAdminPage, requireStaffPage } from "./session";
import { getDb } from "../db/client";

/**
 * Every admin page calls one of these itself. A layout is not a security boundary in the App Router
 * (it doesn't re-run on client-side navigation), so each page re-checks the role on the server.
 */
export async function staffPage(path: string) {
  const actor = await requireStaffPage(path);
  return { actor, db: await getDb() };
}

export async function adminPage(path: string) {
  const actor = await requireAdminPage(path);
  return { actor, db: await getDb() };
}

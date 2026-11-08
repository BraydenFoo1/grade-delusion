import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./index";
import { getDb } from "../db/client";
import { actorFromSessionUser, assertAdmin, assertCanParticipate, assertStaff, isStaff, isSuspended, type Actor } from "../platform/actor";
import { AppError } from "../platform/errors";
import { isPublicBeta } from "../platform/mode";

/**
 * The signed-in user as an `Actor`, or null. Read from the database on every request (no cookie
 * cache), so a ban, suspension or role change applies immediately. Memoised per request.
 */
export const getActor = cache(async (): Promise<Actor | null> => {
  // Public beta: there are no sessions. Returns before touching headers, auth or the database, so anonymous pages
  // need no secrets or e-mail configuration.
  if (isPublicBeta()) return null;
  // Read the request headers FIRST: that is what tells Next this page is dynamic. Touching the database
  // before it would let `next build` try to prerender the page and connect to a database at build time.
  const requestHeaders = await headers();
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;
  return actorFromSessionUser(session.user as typeof session.user & { role?: string | null; banned?: boolean | null; banExpires?: Date | string | null });
});

/** For pages: sign-in required. Sends visitors to the sign-in page and back again afterwards. */
export async function requireActor(returnTo: string): Promise<Actor> {
  // Public beta: account pages do not exist. Not found straight away (no redirect race with the layout, no work done).
  if (isPublicBeta()) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  const actor = await getActor();
  if (!actor) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  return actor;
}

/** For admin-area pages: signed-in staff, otherwise a 404 (the area's existence isn't confirmed to others). */
export async function requireStaffPage(returnTo: string): Promise<Actor> {
  const actor = await requireActor(returnTo);
  try {
    assertStaff(actor);
  } catch {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return actor;
}

export async function requireAdminPage(returnTo: string): Promise<Actor> {
  const actor = await requireActor(returnTo);
  try {
    assertAdmin(actor);
  } catch {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return actor;
}

/** For server actions and route handlers: throw instead of redirecting. */
export async function actorOrThrow(level: "user" | "participant" | "staff" | "admin" = "participant"): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new AppError("UNAUTHENTICATED", "Sign in to do that.");
  if (level === "participant") assertCanParticipate(actor);
  if (level === "staff") assertStaff(actor);
  if (level === "admin") assertAdmin(actor);
  return actor;
}

export { getDb, isStaff, isSuspended };

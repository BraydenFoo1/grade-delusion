// Who is acting, and what they may do. Pure functions: no I/O, so they are trivial to unit test.
// Every server action and service funnels through these; the UI only uses them to hide buttons.

import { AppError } from "./errors";
import { type Role, toRole } from "./constants";

export type Actor = {
  id: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  banned: boolean;
  banExpires: Date | null;
};

/** The Actor for a Better Auth `session.user` (role, ban and verification fields as stored). Unknown roles become "user". */
export function actorFromSessionUser(u: {
  id: string;
  name: string;
  role?: string | null;
  emailVerified?: boolean | null;
  banned?: boolean | null;
  banExpires?: Date | string | null;
}): Actor {
  return {
    id: u.id,
    name: u.name,
    role: toRole(u.role),
    emailVerified: Boolean(u.emailVerified),
    banned: Boolean(u.banned),
    banExpires: u.banExpires ? new Date(u.banExpires) : null,
  };
}

export const isStaff = (role: Role) => role === "moderator" || role === "admin";
export const isAdmin = (role: Role) => role === "admin";

/** Better Auth leaves `banned = true` after a timed suspension ends, so expiry must be checked here. */
export function isSuspended(actor: Pick<Actor, "banned" | "banExpires">, now = new Date()): boolean {
  if (!actor.banned) return false;
  return !actor.banExpires || actor.banExpires.getTime() > now.getTime();
}

/** Signed in, verified and not suspended: the baseline for writing anything. */
export function assertCanParticipate(actor: Actor, now = new Date()): void {
  if (isSuspended(actor, now)) {
    throw new AppError("SUSPENDED", "Your account is suspended, so you can't do that right now.");
  }
  if (!actor.emailVerified) {
    throw new AppError("UNVERIFIED", "Verify your e-mail address first.");
  }
}

export function assertStaff(actor: Actor, now = new Date()): void {
  if (!isStaff(actor.role) || isSuspended(actor, now) || !actor.emailVerified) {
    throw new AppError("FORBIDDEN", "You don't have permission to do that.");
  }
}

export function assertAdmin(actor: Actor, now = new Date()): void {
  if (!isAdmin(actor.role) || isSuspended(actor, now) || !actor.emailVerified) {
    throw new AppError("FORBIDDEN", "Only admins can do that.");
  }
}

/**
 * May `actor` suspend, ban or restore `target`?
 * Moderators: regular users only. Admins: users and moderators. Nobody: themselves or an admin.
 */
export function canActOnUser(actor: Pick<Actor, "id" | "role">, target: { id: string; role: Role }): boolean {
  if (actor.id === target.id) return false;
  if (actor.role === "moderator") return target.role === "user";
  if (actor.role === "admin") return target.role !== "admin";
  return false;
}

/** Only admins change roles, never their own, and never to or from anything outside the known roles. */
export function canChangeRole(actor: Pick<Actor, "id" | "role">, target: { id: string; role: Role }, next: Role): boolean {
  if (actor.role !== "admin") return false;
  if (actor.id === target.id) return false;
  return target.role !== next;
}

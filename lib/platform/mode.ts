// Release mode. The read-only public beta (no accounts, no participation) has ended: every build is the full community
// platform (registration, sign-in, posting, comments, reactions, reports, moderation, admin, notifications).
//
// `isPublicBeta()` is kept, always false, so the dormant beta code paths that still call it need no edits. Operational
// switches (registration open, submissions open, comments open...) are admin-dashboard settings stored in the database,
// not release gates, and nothing here changes them.

export function isPublicBeta(): boolean {
  return false;
}

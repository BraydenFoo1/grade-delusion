// Public-beta content. Static, reviewed, team-written, and shipped in the repository: during the beta the community
// pages read ONLY from here (no database, no member content, no accounts).
//
// It is deliberately EMPTY: the community page then shows an honest "Community is opening soon" message.
// To publish curated posts later, add entries below (status must be "approved") and review them like any release.
// Never add content written by members: those accounts were created before age assurance existed.

import type { PostView } from "@/lib/services/posts";
import type { PublicProfile } from "@/lib/services/users";

/** Optional site-wide announcement banner text (max 160 characters). */
export const BETA_ANNOUNCEMENT = "";

export const BETA_POSTS: readonly PostView[] = [];

export const BETA_PROFILES: readonly PublicProfile[] = [];

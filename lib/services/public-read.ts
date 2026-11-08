// The read model behind the PUBLIC pages (community feed, post, profile, feed API).
//  - public beta (every deployed build): static content from lib/beta/content.ts. No database, no sessions.
//  - full platform (dev / tests / local e2e): the real database services, unchanged.
// Pages call these instead of touching the database, so the public beta can never reach a database by accident.

import { BETA_ANNOUNCEMENT, BETA_POSTS, BETA_PROFILES } from "@/lib/beta/content";
import { getDb } from "@/lib/db/client";
import { LIMITS } from "@/lib/platform/constants";
import { isPublicBeta } from "@/lib/platform/mode";
import type { FeedQuery } from "@/lib/platform/validation";
import { listComments, type CommentView } from "./comments";
import { getPublicPost, listPublicPosts, type Page, type PostView } from "./posts";
import { getSettings } from "./settings";
import { getPublicProfile, type PublicProfile } from "./users";

export type BetaSource = { posts: readonly PostView[]; profiles: readonly PublicProfile[]; announcement: string };
const BETA: BetaSource = { posts: BETA_POSTS, profiles: BETA_PROFILES, announcement: BETA_ANNOUNCEMENT };

const reactionTotal = (p: PostView) => Object.values(p.reactions).reduce((a, b) => a + b, 0);
const stamp = (p: PostView) => (p.publishedAt ?? p.createdAt).getTime();

/** Feed over static content: approved posts only, same filters, sorting and paging as the database version. */
export function staticFeed(query: FeedQuery, source: BetaSource = BETA, authorId?: string): Page<PostView> {
  const q = query.q?.toLowerCase();
  const items = source.posts
    .filter((p) => p.status === "approved")
    .filter((p) => (query.category === "all" ? true : p.category === query.category))
    .filter((p) => (authorId ? p.author.id === authorId : true))
    .filter((p) => (q ? p.body.toLowerCase().includes(q) || p.author.name.toLowerCase().includes(q) : true))
    .map((p) => ({ ...p, myReaction: null }))
    .sort((a, b) => (query.sort === "top" ? reactionTotal(b) - reactionTotal(a) || stamp(b) - stamp(a) : stamp(b) - stamp(a)));
  const size = LIMITS.pageSize;
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(Math.max(1, query.page), pageCount);
  return { items: items.slice((page - 1) * size, page * size), total: items.length, page, pageCount };
}

export async function publicFeed(query: FeedQuery, opts: { viewerId?: string; authorId?: string } = {}): Promise<Page<PostView>> {
  if (isPublicBeta()) return staticFeed(query, BETA, opts.authorId);
  return listPublicPosts(await getDb(), query, opts);
}

export async function publicPost(id: string, viewerId?: string): Promise<PostView | null> {
  if (isPublicBeta()) return BETA.posts.find((p) => p.status === "approved" && p.id === id) ?? null;
  return getPublicPost(await getDb(), id, viewerId);
}

/** Comments are not part of the beta, so there are none to show. */
export async function publicComments(postId: string): Promise<CommentView[]> {
  if (isPublicBeta()) return [];
  return listComments(await getDb(), postId);
}

export async function publicProfile(id: string): Promise<PublicProfile | null> {
  if (isPublicBeta()) return BETA.profiles.find((p) => p.id === id) ?? null;
  return getPublicProfile(await getDb(), id);
}

export async function publicAnnouncement(): Promise<string> {
  if (isPublicBeta()) return BETA.announcement;
  return (await getSettings(await getDb())).announcement;
}

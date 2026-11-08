import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PostCard from "@/components/platform/community/PostCard";
import { Avatar, EmptyState, Pagination } from "@/components/platform/ui";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { isSuspended } from "@/lib/platform/actor";
import { formatDate, plural } from "@/lib/platform/format";
import { listPublicPosts } from "@/lib/services/posts";
import { getPublicProfile } from "@/lib/services/users";

// Profiles are never indexed: they carry display names of members who may be minors.
export const metadata: Metadata = { title: "Profile", robots: { index: false, follow: false } };

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { id } = await params;
  const { page: rawPage } = await searchParams;
  const [actor, db] = await Promise.all([getActor(), getDb()]);
  const profile = await getPublicProfile(db, id);
  if (!profile) notFound(); // unknown, suspended and banned users all look the same
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const posts = await listPublicPosts(db, { category: "all", sort: "new", page }, { viewerId: actor?.id, authorId: id });
  const viewer = { id: actor?.id ?? null, canParticipate: Boolean(actor && actor.emailVerified && !isSuspended(actor)) };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex flex-wrap items-center gap-5">
        <Avatar name={profile.name} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="pf-title [overflow-wrap:anywhere]">{profile.name}</h1>
          <p className="pf-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {profile.role !== "user" ? <span className="pf-badge pf-badge-info">{profile.role}</span> : null}
            <span>
              {plural(profile.approvedPosts, "delusion")} · {plural(profile.reactionsReceived, "reaction")} received · joined {formatDate(profile.joinedAt)}
            </span>
          </p>
          {profile.bio ? <p className="pf-prose mt-3 text-[1.0625rem]">{profile.bio}</p> : null}
        </div>
        {actor?.id === profile.id ? (
          <Link href="/settings" className="pf-btn pf-btn-sm">
            Edit profile
          </Link>
        ) : null}
      </header>

      {posts.items.length === 0 ? (
        <EmptyState icon="chat" title="No public delusions yet">
          {profile.name} hasn&apos;t had a post approved yet.
        </EmptyState>
      ) : (
        <ul className="space-y-6">
          {posts.items.map((p) => (
            <li key={p.id}>
              <PostCard post={p} viewer={viewer} />
            </li>
          ))}
        </ul>
      )}
      <Pagination page={posts.page} pageCount={posts.pageCount} hrefFor={(n) => (n > 1 ? `/u/${id}?page=${n}` : `/u/${id}`)} />
    </div>
  );
}

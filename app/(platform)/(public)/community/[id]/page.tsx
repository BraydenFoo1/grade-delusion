import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CommentThread from "@/components/platform/community/CommentThread";
import { CommentForm } from "@/components/platform/community/Interactions";
import PostCard from "@/components/platform/community/PostCard";
import Icon from "@/components/platform/Icon";
import { EmptyState, Notice } from "@/components/platform/ui";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { isSuspended } from "@/lib/platform/actor";
import { plural } from "@/lib/platform/format";
import { listComments } from "@/lib/services/comments";
import { getPublicPost } from "@/lib/services/posts";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPublicPost(await getDb(), id);
  // Same privacy default as the feed: not indexed (see community/page.tsx).
  const robots = { index: false, follow: true };
  if (!post) return { title: "Not found", robots };
  const text = post.body.replace(/\s+/g, " ");
  return { title: `“${text.slice(0, 50)}${text.length > 50 ? "…" : ""}”`, description: `A delusion by ${post.author.name}.`, robots };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, db] = await Promise.all([getActor(), getDb()]);
  const post = await getPublicPost(db, id, actor?.id);
  // Pending, rejected, removed and non-existent posts all look the same: not found.
  if (!post) notFound();
  const comments = await listComments(db, id);
  const viewer = { id: actor?.id ?? null, canParticipate: Boolean(actor && actor.emailVerified && !isSuspended(actor)) };
  const signInHref = `/sign-in?next=${encodeURIComponent(`/community/${id}`)}`;
  const visibleCount = comments.filter((c) => !c.removed).length;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/community" className="pf-link inline-flex items-center gap-1.5 text-sm">
        <Icon name="back" size={16} /> All delusions
      </Link>
      <PostCard post={post} viewer={viewer} headingLevel="h1" detail />

      <section aria-labelledby="comments-title" className="space-y-5">
        <h2 id="comments-title" className="text-xl font-bold">
          {plural(visibleCount, "comment")}
        </h2>
        {viewer.canParticipate ? (
          <CommentForm postId={id} />
        ) : actor ? (
          <Notice tone="info">Your account can&apos;t comment right now.</Notice>
        ) : (
          <Notice tone="info">
            <Link href={signInHref} className="pf-link">
              Sign in
            </Link>{" "}
            or{" "}
            <Link href="/sign-up" className="pf-link">
              join
            </Link>{" "}
            to comment and react.
          </Notice>
        )}
        {comments.length === 0 ? (
          <EmptyState icon="chat" title="No comments yet">
            Say something supportive, or at least something funny.
          </EmptyState>
        ) : (
          <CommentThread comments={comments} postId={id} viewer={viewer} />
        )}
      </section>
    </div>
  );
}

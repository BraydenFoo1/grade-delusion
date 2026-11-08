import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PostComposer from "@/components/platform/community/PostComposer";
import { Notice, PageHeader } from "@/components/platform/ui";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { isSuspended } from "@/lib/platform/actor";
import { getOwnPost } from "@/lib/services/posts";

export const metadata: Metadata = { title: "Edit submission" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor(`/my-submissions/${id}/edit`);
  const post = await getOwnPost(await getDb(), actor, id);
  if (!post) notFound(); // someone else's post is indistinguishable from a missing one
  const locked = post.status === "removed" ? "A moderator removed this post, so it can't be edited." : isSuspended(actor) ? "Your account is suspended, so you can't edit right now." : null;
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Edit submission">Changes go back to the moderators before anyone sees them.</PageHeader>
      {post.moderationNote && post.status === "rejected" ? (
        <Notice tone="info">
          <b>Moderator note:</b> {post.moderationNote}
        </Notice>
      ) : null}
      {locked ? (
        <div className="space-y-4">
          <Notice tone="info">{locked}</Notice>
          <Link href="/my-submissions" className="pf-btn">
            Back to my submissions
          </Link>
        </div>
      ) : (
        <div className="pf-card pf-lift p-5 sm:p-7">
          <PostComposer edit={{ id: post.id, body: post.body, category: post.category, wasLive: post.status === "approved" }} />
        </div>
      )}
    </div>
  );
}

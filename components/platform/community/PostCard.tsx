import Link from "next/link";
import type { PostView } from "@/lib/services/posts";
import { categoryLabel } from "@/lib/platform/constants";
import { plural } from "@/lib/platform/format";
import Icon from "../Icon";
import { Avatar, Time } from "../ui";
import { ReactionBar, ReportButton } from "./Interactions";

export type Viewer = { id: string | null; canParticipate: boolean };

/** One delusion. The text is rendered as plain text (never HTML), preserving the author's line breaks. */
export default function PostCard({ post, viewer, headingLevel = "h2", detail = false }: { post: PostView; viewer: Viewer; headingLevel?: "h1" | "h2" | "h3"; detail?: boolean }) {
  const signInHref = `/sign-in?next=${encodeURIComponent(`/community/${post.id}`)}`;
  const isOwn = viewer.id === post.author.id;
  const Heading = headingLevel;
  return (
    <article className="pf-card pf-lift p-5 sm:p-6" aria-labelledby={`post-${post.id}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link href={`/u/${post.author.id}`} className="flex min-w-0 items-center gap-2.5 font-bold hover:underline">
          <Avatar name={post.author.name} />
          <span className="truncate">{post.author.name}</span>
        </Link>
        <span className="pf-muted text-sm">
          <Time date={post.publishedAt ?? post.createdAt} />
          {post.editedAt ? " · edited" : ""}
        </span>
        <Link href={`/community?category=${post.category}`} className="pf-badge pf-badge-info ml-auto hover:underline">
          {categoryLabel(post.category)}
        </Link>
      </div>

      <Heading id={`post-${post.id}`} className="sr-only">
        Delusion by {post.author.name}
      </Heading>
      <p className={detail ? "pf-prose mt-4 text-[1.1875rem]" : "pf-prose mt-4 text-[1.0625rem]"}>{post.body}</p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <ReactionBar postId={post.id} counts={post.reactions} mine={post.myReaction} canReact={viewer.canParticipate} signInHref={signInHref} />
        <div className="flex items-center gap-1">
          {!detail ? (
            <Link href={`/community/${post.id}`} className="pf-btn pf-btn-ghost pf-btn-sm">
              <Icon name="chat" size={16} /> {plural(post.commentCount, "comment")}
            </Link>
          ) : null}
          {!isOwn ? <ReportButton targetType="post" targetId={post.id} canReport={viewer.canParticipate} signInHref={signInHref} /> : null}
        </div>
      </div>
    </article>
  );
}

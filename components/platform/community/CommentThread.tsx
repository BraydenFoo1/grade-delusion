import Link from "next/link";
import type { CommentView } from "@/lib/services/comments";
import { Avatar, Time } from "../ui";
import { CommentControls } from "./Interactions";

type Viewer = { id: string | null; canParticipate: boolean };

function Comment({ c, postId, viewer, signInHref, topLevel }: { c: CommentView; postId: string; viewer: Viewer; signInHref: string; topLevel: boolean }) {
  if (c.removed) {
    // The text and author of a removed comment never reach the page; replies stay readable under a placeholder.
    return <p className="pf-removed py-2 text-[0.9375rem]">This comment was removed by a moderator.</p>;
  }
  return (
    <div className="flex gap-3">
      <Avatar name={c.author.name} size={32} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <Link href={`/u/${c.author.id}`} className="font-bold hover:underline">
            {c.author.name}
          </Link>{" "}
          <span className="pf-muted">
            · <Time date={c.createdAt} />
          </span>
        </p>
        <p className="pf-prose mt-0.5 text-[1rem]">{c.body}</p>
        <CommentControls
          postId={postId}
          commentId={c.id}
          canReply={viewer.canParticipate}
          isOwn={viewer.id === c.author.id}
          canReport={viewer.canParticipate}
          signInHref={signInHref}
          topLevel={topLevel}
        />
      </div>
    </div>
  );
}

/** Two levels only: top-level comments and replies to them. */
export default function CommentThread({ comments, postId, viewer }: { comments: CommentView[]; postId: string; viewer: Viewer }) {
  const signInHref = `/sign-in?next=${encodeURIComponent(`/community/${postId}`)}`;
  const top = comments.filter((c) => !c.parentId);
  const replies = new Map<string, CommentView[]>();
  for (const c of comments) if (c.parentId) replies.set(c.parentId, [...(replies.get(c.parentId) ?? []), c]);

  return (
    <ul className="space-y-5">
      {top.map((c) => (
        <li key={c.id}>
          <Comment c={c} postId={postId} viewer={viewer} signInHref={signInHref} topLevel />
          {(replies.get(c.id) ?? []).length > 0 ? (
            <ul className="pf-hair mt-3 space-y-4 border-l-2 pl-4 sm:ml-11">
              {(replies.get(c.id) ?? []).map((r) => (
                <li key={r.id}>
                  <Comment c={r} postId={postId} viewer={viewer} signInHref={signInHref} topLevel={false} />
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

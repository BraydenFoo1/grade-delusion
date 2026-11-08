import type { Metadata } from "next";
import Link from "next/link";
import { ReviewControls } from "@/components/platform/admin/AdminActions";
import { EmptyState, PageHeader, Pagination, Time } from "@/components/platform/ui";
import { staffPage } from "@/lib/auth/admin-page";
import { isAdmin } from "@/lib/platform/actor";
import { categoryLabel } from "@/lib/platform/constants";
import { plural } from "@/lib/platform/format";
import { listPostsForStaff } from "@/lib/services/posts";

export const metadata: Metadata = { title: "Review queue" };

export default async function QueuePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const { actor, db } = await staffPage("/admin/queue");
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  // Oldest first: the person who has waited longest is seen first.
  const queue = await listPostsForStaff(db, actor, { status: "pending", oldestFirst: true, page });

  return (
    <>
      <PageHeader title="Review queue">
        {queue.total === 0 ? "Nothing is waiting." : `${plural(queue.total, "post")} waiting, oldest first.`} Approve what&apos;s funny and kind. When you reject, a short note helps the author do better next time.
      </PageHeader>

      {queue.items.length === 0 ? (
        <EmptyState icon="check" title="The queue is empty">
          New submissions appear here the moment members send them.
        </EmptyState>
      ) : (
        <ul className="space-y-6">
          {queue.items.map((p) => (
            <li key={p.id} className="pf-card pf-lift p-5 sm:p-6">
              <p className="pf-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <Link href={`/admin/users/${p.author.id}`} className="pf-link">
                  {p.author.name}
                </Link>
                <span>{categoryLabel(p.category)}</span>
                <Time date={p.createdAt} />
                {p.editedAt ? <span>· resubmitted after an edit</span> : null}
              </p>
              <p className="pf-prose mt-3 text-[1.1875rem]">{p.body}</p>
              {p.openReports > 0 ? <p className="pf-error-text mt-2 text-sm font-semibold">This post has {plural(p.openReports, "open report")}.</p> : null}
              <div className="mt-5">
                <ReviewControls postId={p.id} version={p.editedAt ? new Date(p.editedAt).toISOString() : ""} ownPost={p.author.id === actor.id} isAdmin={isAdmin(actor.role)} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={queue.page} pageCount={queue.pageCount} hrefFor={(n) => `/admin/queue?page=${n}`} />
    </>
  );
}

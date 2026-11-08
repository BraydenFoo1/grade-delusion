import type { Metadata } from "next";
import Link from "next/link";
import { MarkAllReadButton, MarkReadButton } from "@/components/platform/account/Controls";
import { EmptyState, PageHeader, Pagination, Time } from "@/components/platform/ui";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { listNotifications } from "@/lib/services/notifications";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const actor = await requireActor("/notifications");
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const result = await listNotifications(await getDb(), actor.id, { page });
  const unread = result.rows.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Notifications" actions={<MarkAllReadButton disabled={unread === 0} />}>
        Approvals, comments, replies and moderator messages.
      </PageHeader>
      {result.rows.length === 0 ? (
        <EmptyState icon="bell" title="You're all caught up">
          You&apos;ll hear about it here when a moderator reviews your posts or someone comments on them.
        </EmptyState>
      ) : (
        <ul className="pf-card divide-y-2 divide-(--pf-line-soft) overflow-hidden">
          {result.rows.map((n) => {
            const target =
              n.postId && (n.type === "comment_on_post" || n.type === "reply_to_comment" || n.type === "post_approved")
                ? `/community/${n.postId}`
                : n.type.startsWith("post_")
                  ? "/my-submissions"
                  : null;
            return (
              <li key={n.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5", !n.readAt && "bg-(--pf-sunken)")}>
                <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-(--hot)")} />
                <div className="min-w-0 flex-1">
                  <p className={cn("[overflow-wrap:anywhere]", !n.readAt && "font-semibold")}>
                    {n.message}
                    {!n.readAt ? <span className="sr-only"> (unread)</span> : null}
                  </p>
                  <p className="pf-muted text-sm">
                    <Time date={n.createdAt} />
                    {target ? (
                      <>
                        {" · "}
                        <Link href={target} className="pf-link">
                          View
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
                {!n.readAt ? <MarkReadButton id={n.id} /> : null}
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(p) => (p > 1 ? `/notifications?page=${p}` : "/notifications")} />
    </div>
  );
}

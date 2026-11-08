import type { Metadata } from "next";
import Link from "next/link";
import Icon, { type IconName } from "@/components/platform/Icon";
import { EmptyState, PageHeader, StatusBadge, Time } from "@/components/platform/ui";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { listActivity } from "@/lib/services/users";

export const metadata: Metadata = { title: "Activity" };

const ICON: Record<string, IconName> = { post: "pencil", comment: "chat", reaction: "plus", report: "flag" };

export default async function ActivityPage() {
  const actor = await requireActor("/activity");
  const items = await listActivity(await getDb(), actor.id);
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Activity">What you&apos;ve posted, commented on, reacted to and reported, newest first.</PageHeader>
      {items.length === 0 ? (
        <EmptyState icon="clock" title="Nothing yet" action={<Link href="/community" className="pf-btn pf-btn-primary">Browse the community</Link>}>
          Your posts, comments and reactions will be listed here.
        </EmptyState>
      ) : (
        <ol className="pf-card divide-y-2 divide-(--pf-line-soft) overflow-hidden">
          {items.map((a, i) => (
            <li key={`${a.kind}-${i}-${a.at.toISOString()}`} className="flex items-start gap-3 px-4 py-3.5">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border-2 border-(--pf-line-soft)">
                <Icon name={ICON[a.kind]} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="[overflow-wrap:anywhere]">
                  {a.postId && a.kind !== "post" ? (
                    <Link href={`/community/${a.postId}`} className="hover:underline">
                      {a.text}
                    </Link>
                  ) : (
                    a.text
                  )}
                </p>
                <p className="pf-muted mt-0.5 flex flex-wrap items-center gap-2 text-sm">
                  <Time date={a.at} />
                  {a.status && a.kind !== "comment" ? <StatusBadge status={a.status} /> : null}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

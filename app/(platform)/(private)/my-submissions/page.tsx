import type { Metadata } from "next";
import Link from "next/link";
import { DeletePostButton } from "@/components/platform/account/Controls";
import Icon from "@/components/platform/Icon";
import { EmptyState, LinkButton, Notice, PageHeader, Pagination, StatusBadge, Time } from "@/components/platform/ui";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { categoryLabel, POST_STATUSES, type PostStatus } from "@/lib/platform/constants";
import { listOwnPosts } from "@/lib/services/posts";

export const metadata: Metadata = { title: "My submissions" };

const FILTERS: { key: PostStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "In review" },
  { key: "approved", label: "Live" },
  { key: "rejected", label: "Not approved" },
  { key: "removed", label: "Removed" },
];

export default async function MySubmissionsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; saved?: string }> }) {
  const sp = await searchParams;
  const actor = await requireActor("/my-submissions");
  const status = (POST_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as PostStatus) : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const result = await listOwnPosts(await getDb(), actor, { status, page });
  const link = (s: string, p = 1) => `/my-submissions?${new URLSearchParams({ ...(s !== "all" ? { status: s } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`.replace(/\?$/, "");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title="My submissions" actions={<LinkButton href="/submit" variant="primary">New submission</LinkButton>}>
        Everything you&apos;ve sent, and where it is in review.
      </PageHeader>
      {sp.saved ? <Notice tone="ok">Saved. Your updated post is back with the moderators.</Notice> : null}

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={link(f.key)} className="pf-chip" aria-current={(status ?? "all") === f.key ? "true" : undefined}>
            {f.label}
          </Link>
        ))}
      </nav>

      {result.items.length === 0 ? (
        <EmptyState icon="list" title={status ? "Nothing here" : "You haven't submitted anything yet"} action={<LinkButton href="/submit" variant="primary">Write your first delusion</LinkButton>}>
          {status ? "No posts with that status." : "Your posts show up here with their review status, so you always know what's happening."}
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {result.items.map((p) => (
            <li key={p.id} className="pf-card p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <StatusBadge status={p.status} />
                <span className="pf-muted text-sm">
                  {categoryLabel(p.category)} · <Time date={p.createdAt} />
                </span>
              </div>
              <p className="pf-prose mt-3 text-[1.0625rem]">{p.body}</p>
              {p.moderationNote && (p.status === "rejected" || p.status === "removed") ? (
                <p className="pf-panel mt-3 px-3 py-2 text-[0.9375rem]">
                  <b>Moderator note:</b> {p.moderationNote}
                </p>
              ) : null}
              {p.status === "approved" ? (
                <p className="pf-muted mt-3 text-sm">
                  {Object.values(p.reactions).reduce((a, b) => a + b, 0)} reactions · {p.commentCount} comments
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-1">
                {p.status === "approved" ? (
                  <Link href={`/community/${p.id}`} className="pf-btn pf-btn-ghost pf-btn-sm">
                    <Icon name="external" size={16} /> View
                  </Link>
                ) : null}
                {p.status !== "removed" ? (
                  <Link href={`/my-submissions/${p.id}/edit`} className="pf-btn pf-btn-ghost pf-btn-sm">
                    <Icon name="pencil" size={16} /> {p.status === "rejected" ? "Revise" : "Edit"}
                  </Link>
                ) : null}
                {p.status !== "removed" ? <DeletePostButton id={p.id} /> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(n) => link(status ?? "all", n)} />
    </div>
  );
}

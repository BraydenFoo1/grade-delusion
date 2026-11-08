import type { Metadata } from "next";
import Link from "next/link";
import { PostStaffActions } from "@/components/platform/admin/AdminActions";
import AdminSearch, { qs } from "@/components/platform/admin/AdminSearch";
import { EmptyState, PageHeader, Pagination, StatusBadge, Time } from "@/components/platform/ui";
import { staffPage } from "@/lib/auth/admin-page";
import { isAdmin } from "@/lib/platform/actor";
import { categoryLabel, POST_STATUSES, type PostStatus } from "@/lib/platform/constants";
import { plural } from "@/lib/platform/format";
import { listPostsForStaff } from "@/lib/services/posts";

export const metadata: Metadata = { title: "Manage posts" };

const FILTERS: { key: PostStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "In review" },
  { key: "approved", label: "Live" },
  { key: "rejected", label: "Not approved" },
  { key: "removed", label: "Removed" },
];

export default async function AdminPostsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const { actor, db } = await staffPage("/admin/posts");
  const status = (POST_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as PostStatus) : undefined;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const result = await listPostsForStaff(db, actor, { status, q, page });

  return (
    <>
      <PageHeader title="Posts">Search every submission, in any state. Remove live posts, or restore removed ones.</PageHeader>
      <AdminSearch action="/admin/posts" q={q} placeholder="Search post text or author name" keep={{ status }} />
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/admin/posts${qs({ status: f.key, q })}`} className="pf-chip" aria-current={(status ?? "all") === f.key ? "true" : undefined}>
            {f.label}
          </Link>
        ))}
      </nav>
      <p className="pf-muted text-sm" aria-live="polite">
        {plural(result.total, "post")}
        {q ? ` matching “${q}”` : ""}
      </p>

      {result.items.length === 0 ? (
        <EmptyState icon="search" title="No posts match">
          Try another status or a shorter search.
        </EmptyState>
      ) : (
        <div className="pf-card overflow-x-auto">
          <table className="pf-table min-w-[44rem]">
            <thead>
              <tr>
                <th scope="col">Post</th>
                <th scope="col">Author</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((p) => (
                <tr key={p.id}>
                  <td className="max-w-md">
                    <p className="line-clamp-3 [overflow-wrap:anywhere]">{p.body}</p>
                    <p className="pf-muted mt-1 text-sm">
                      {categoryLabel(p.category)} · <Time date={p.createdAt} />
                      {p.openReports > 0 ? <span className="pf-error-text font-semibold"> · {plural(p.openReports, "open report")}</span> : null}
                    </p>
                    {p.moderationNote ? (
                      <p className="pf-muted mt-1 text-sm">
                        Note: {p.moderationNote}
                        {p.moderatorName ? ` (${p.moderatorName})` : ""}
                      </p>
                    ) : null}
                  </td>
                  <td>
                    <Link href={`/admin/users/${p.author.id}`} className="pf-link">
                      {p.author.name}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="min-w-48">
                    <PostStaffActions postId={p.id} version={p.editedAt ? new Date(p.editedAt).toISOString() : ""} status={p.status} ownPost={p.author.id === actor.id} isAdmin={isAdmin(actor.role)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(n) => `/admin/posts${qs({ status, q, page: n })}`} />
    </>
  );
}

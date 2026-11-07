import type { Metadata } from "next";
import Link from "next/link";
import { CommentStaffActions } from "@/components/platform/admin/AdminActions";
import AdminSearch, { qs } from "@/components/platform/admin/AdminSearch";
import { EmptyState, PageHeader, Pagination, StatusBadge, Time } from "@/components/platform/ui";
import { staffPage } from "@/lib/auth/admin-page";
import { isAdmin } from "@/lib/platform/actor";
import { plural } from "@/lib/platform/format";
import { listCommentsForStaff } from "@/lib/services/comments";

export const metadata: Metadata = { title: "Manage comments" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "visible", label: "Visible" },
  { key: "removed", label: "Removed" },
] as const;

export default async function AdminCommentsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const { actor, db } = await staffPage("/admin/comments");
  const status = sp.status === "visible" || sp.status === "removed" ? sp.status : undefined;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const result = await listCommentsForStaff(db, actor, { status, q, page });

  return (
    <>
      <PageHeader title="Comments">Search and moderate comments and replies.</PageHeader>
      <AdminSearch action="/admin/comments" q={q} placeholder="Search comment text" keep={{ status }} />
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/admin/comments${qs({ status: f.key, q })}`} className="pf-chip" aria-current={(status ?? "all") === f.key ? "true" : undefined}>
            {f.label}
          </Link>
        ))}
      </nav>
      <p className="pf-muted text-sm" aria-live="polite">
        {plural(result.total, "comment")}
        {q ? ` matching “${q}”` : ""}
      </p>

      {result.items.length === 0 ? (
        <EmptyState icon="chat" title="No comments match">
          Try another filter or a shorter search.
        </EmptyState>
      ) : (
        <div className="pf-card overflow-x-auto">
          <table className="pf-table min-w-[40rem]">
            <thead>
              <tr>
                <th scope="col">Comment</th>
                <th scope="col">Author</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((c) => (
                <tr key={c.id}>
                  <td className="max-w-md">
                    <p className="line-clamp-3 [overflow-wrap:anywhere]">{c.body}</p>
                    <p className="pf-muted mt-1 text-sm">
                      <Time date={c.createdAt} />
                      {c.openReports > 0 ? <span className="pf-error-text font-semibold"> · {plural(c.openReports, "open report")}</span> : null}
                      {c.removalNote ? ` · Note: ${c.removalNote}` : ""}
                    </p>
                  </td>
                  <td>
                    <Link href={`/admin/users/${c.author.id}`} className="pf-link">
                      {c.author.name}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="min-w-40">
                    <CommentStaffActions commentId={c.id} status={c.status} ownComment={c.author.id === actor.id} isAdmin={isAdmin(actor.role)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(n) => `/admin/comments${qs({ status, q, page: n })}`} />
    </>
  );
}

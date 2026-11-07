import type { Metadata } from "next";
import Link from "next/link";
import { ReportControls } from "@/components/platform/admin/AdminActions";
import { EmptyState, PageHeader, Pagination, StatusBadge, Time } from "@/components/platform/ui";
import { staffPage } from "@/lib/auth/admin-page";
import { isAdmin } from "@/lib/platform/actor";
import { REPORT_REASONS, REPORT_STATUSES, type ReportStatus } from "@/lib/platform/constants";
import { listReports } from "@/lib/services/reports";

export const metadata: Metadata = { title: "Reports" };

const TABS: { key: ReportStatus; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
];
const RESOLUTION: Record<string, string> = { content_removed: "Content removed", no_action: "Reviewed, no action", dismissed: "Dismissed" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const { actor, db } = await staffPage("/admin/reports");
  const status = (REPORT_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as ReportStatus) : "open";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const result = await listReports(db, actor, { status, page });
  const reason = (k: string) => REPORT_REASONS.find((r) => r.key === k)?.label ?? k;

  return (
    <>
      <PageHeader title="Reports">What members flagged. Reporters are only visible to staff, never to the person reported.</PageHeader>
      <nav aria-label="Report status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/reports?status=${t.key}`} className="pf-chip" aria-current={status === t.key ? "true" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>

      {result.items.length === 0 ? (
        <EmptyState icon="flag" title={status === "open" ? "No open reports" : "Nothing here"}>
          {status === "open" ? "When someone reports a post or comment it will show up here, oldest first." : "Closed reports are kept here for reference."}
        </EmptyState>
      ) : (
        <ul className="space-y-5">
          {result.items.map((r) => (
            <li key={r.id} className="pf-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="pf-badge pf-badge-rejected">{reason(r.reason)}</span>
                <span className="pf-badge pf-badge-info">{r.targetType}</span>
                <StatusBadge status={r.targetStatus} />
                <span className="pf-muted ml-auto text-sm">
                  <Time date={r.createdAt} />
                </span>
              </div>
              <blockquote className="pf-prose pf-panel mt-4 px-4 py-3 text-[1.0625rem]">{r.contentSnapshot}</blockquote>
              <p className="pf-muted mt-3 text-sm">
                By{" "}
                {r.targetAuthor ? (
                  <Link href={`/admin/users/${r.targetAuthor.id}`} className="pf-link">
                    {r.targetAuthor.name}
                  </Link>
                ) : (
                  "a deleted user"
                )}
                {" · reported by "}
                {r.reporterName ?? "a deleted user"}
                {r.targetType === "post" && r.postId && r.targetStatus === "approved" ? (
                  <>
                    {" · "}
                    <Link href={`/community/${r.postId}`} className="pf-link">
                      View live
                    </Link>
                  </>
                ) : null}
              </p>
              {r.note ? (
                <p className="mt-2 text-[0.9375rem]">
                  <b>Reporter&apos;s note:</b> {r.note}
                </p>
              ) : null}
              <div className="mt-4">
                {r.status === "open" ? (
                  <ReportControls reportId={r.id} targetStatus={r.targetStatus} ownContent={r.targetAuthor?.id === actor.id} isAdmin={isAdmin(actor.role)} />
                ) : (
                  <p className="pf-muted text-sm">
                    {RESOLUTION[r.resolution ?? ""] ?? r.status}
                    {r.resolvedByName ? ` by ${r.resolvedByName}` : ""}
                    {r.resolvedAt ? (
                      <>
                        {" · "}
                        <Time date={r.resolvedAt} />
                      </>
                    ) : null}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(n) => `/admin/reports?status=${status}&page=${n}`} />
    </>
  );
}

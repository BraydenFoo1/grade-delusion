import type { Metadata } from "next";
import Link from "next/link";
import { qs } from "@/components/platform/admin/AdminSearch";
import { EmptyState, PageHeader, Pagination } from "@/components/platform/ui";
import { adminPage } from "@/lib/auth/admin-page";
import { formatDateTime, plural } from "@/lib/platform/format";
import { listAudit } from "@/lib/services/audit";

export const metadata: Metadata = { title: "Audit log" };

const GROUPS = [
  { key: "all", label: "Everything" },
  { key: "moderation", label: "Moderation" },
  { key: "user.role", label: "Role changes" },
  { key: "settings", label: "Settings" },
  { key: "account", label: "Account deletions" },
  { key: "retention", label: "Retention" },
] as const;

/** Compact, readable details: `from: user, to: moderator`. Values are plain ids and states by design. */
function details(d: Record<string, unknown>): string {
  return Object.entries(d)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ");
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; page?: string }> }) {
  const sp = await searchParams;
  const { actor, db } = await adminPage("/admin/audit");
  const group = GROUPS.find((g) => g.key === sp.action)?.key ?? "all";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const result = await listAudit(db, actor, { action: group === "all" ? undefined : group, page });

  return (
    <>
      <PageHeader title="Audit log">
        An append-only record of moderation, role changes and settings. The database refuses edits and deletes, so this can&apos;t be rewritten.
      </PageHeader>
      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <Link key={g.key} href={`/admin/audit${qs({ action: g.key })}`} className="pf-chip" aria-current={group === g.key ? "true" : undefined}>
            {g.label}
          </Link>
        ))}
      </nav>
      <p className="pf-muted text-sm" aria-live="polite">
        {plural(result.total, "entry", "entries")}
      </p>
      {result.rows.length === 0 ? (
        <EmptyState icon="clock" title="No entries yet">
          Moderation decisions and admin changes are recorded here as they happen.
        </EmptyState>
      ) : (
        <div className="pf-card overflow-x-auto">
          <table className="pf-table min-w-[44rem]">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Who</th>
                <th scope="col">What</th>
                <th scope="col">Target</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.id}>
                  <td className="pf-muted whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                  <td>
                    {r.actorId ? (
                      <Link href={`/admin/users/${r.actorId}`} className="pf-link">
                        {r.actorName ?? "Deleted user"}
                      </Link>
                    ) : (
                      <span className="pf-muted">System</span>
                    )}
                    {r.actorRole ? <span className="pf-muted text-sm"> ({r.actorRole})</span> : null}
                  </td>
                  <td>
                    <code className="text-[0.8125rem] font-semibold">{r.action}</code>
                    {Object.keys(r.details).length ? <p className="pf-muted mt-0.5 text-sm [overflow-wrap:anywhere]">{details(r.details)}</p> : null}
                  </td>
                  <td className="pf-muted text-sm [overflow-wrap:anywhere]">
                    {r.targetType ? `${r.targetType}${r.targetId ? ` ${r.targetId.slice(0, 8)}…` : ""}` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(n) => `/admin/audit${qs({ action: group, page: n })}`} />
    </>
  );
}

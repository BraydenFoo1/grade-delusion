import type { Metadata } from "next";
import Link from "next/link";
import AdminSearch, { qs } from "@/components/platform/admin/AdminSearch";
import { EmptyState, PageHeader, Pagination } from "@/components/platform/ui";
import { staffPage } from "@/lib/auth/admin-page";
import { isAdmin } from "@/lib/platform/actor";
import { formatDate } from "@/lib/platform/format";
import { plural } from "@/lib/platform/format";
import { isRole } from "@/lib/platform/constants";
import { listUsers } from "@/lib/services/users";

export const metadata: Metadata = { title: "Users" };

const STATES = [
  { key: "all", label: "Everyone" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
] as const;
const ROLE_FILTERS = [{ key: "all", label: "Any role" }, { key: "user", label: "Members" }, { key: "moderator", label: "Moderators" }, { key: "admin", label: "Admins" }] as const;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; role?: string; page?: string }> }) {
  const sp = await searchParams;
  const { actor, db } = await staffPage("/admin/users");
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const state = sp.state === "active" || sp.state === "suspended" ? sp.state : "all";
  const role = isRole(sp.role) ? sp.role : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const result = await listUsers(db, actor, { q, state, role, page });

  return (
    <>
      <PageHeader title="Users">
        Find members, then open their page to see their history or take action.{" "}
        {isAdmin(actor.role) ? "You can search by e-mail address too." : "E-mail addresses are masked for moderators."}
      </PageHeader>
      <AdminSearch action="/admin/users" q={q} placeholder={isAdmin(actor.role) ? "Search by name or e-mail" : "Search by name"} keep={{ state: state === "all" ? undefined : state, role }} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Account state" className="flex flex-wrap gap-2">
          {STATES.map((s) => (
            <Link key={s.key} href={`/admin/users${qs({ q, state: s.key, role })}`} className="pf-chip" aria-current={state === s.key ? "true" : undefined}>
              {s.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Role" className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((r) => (
            <Link key={r.key} href={`/admin/users${qs({ q, state, role: r.key })}`} className="pf-chip" aria-current={(role ?? "all") === r.key ? "true" : undefined}>
              {r.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="pf-muted text-sm" aria-live="polite">
        {plural(result.total, "account")}
        {q ? ` matching “${q}”` : ""}
      </p>

      {result.items.length === 0 ? (
        <EmptyState icon="users" title="No accounts match">
          Try a shorter search or clear the filters.
        </EmptyState>
      ) : (
        <div className="pf-card overflow-x-auto">
          <table className="pf-table min-w-[40rem]">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">E-mail</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Joined</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold [overflow-wrap:anywhere]">
                    <Link href={`/admin/users/${u.id}`} className="pf-link">
                      {u.name}
                    </Link>
                  </td>
                  <td className="[overflow-wrap:anywhere]">
                    {u.email}
                    {!u.emailVerified ? <span className="pf-muted text-sm"> (unconfirmed)</span> : null}
                  </td>
                  <td className="capitalize">{u.role}</td>
                  <td>{u.suspended ? <span className="pf-badge pf-badge-rejected">{u.banExpires ? "Suspended" : "Banned"}</span> : <span className="pf-muted">Active</span>}</td>
                  <td className="pf-muted whitespace-nowrap">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(n) => `/admin/users${qs({ q, state, role, page: n })}`} />
    </>
  );
}

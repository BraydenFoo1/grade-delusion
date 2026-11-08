import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/platform/ui";
import { adminPage } from "@/lib/auth/admin-page";
import { formatDate } from "@/lib/platform/format";
import { listStaffMembers } from "@/lib/services/users";

export const metadata: Metadata = { title: "Moderators" };

export default async function ModeratorsPage() {
  const { actor, db } = await adminPage("/admin/moderators");
  const staff = await listStaffMembers(db, actor);
  return (
    <>
      <PageHeader title="Moderators">Everyone who can review posts and handle reports. Only admins see this page.</PageHeader>
      <div className="pf-card overflow-x-auto">
        <table className="pf-table min-w-[34rem]">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Joined</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td className="font-semibold [overflow-wrap:anywhere]">
                  <Link href={`/admin/users/${s.id}`} className="pf-link">
                    {s.name}
                  </Link>
                  {s.id === actor.id ? <span className="pf-muted font-normal"> (you)</span> : null}
                </td>
                <td className="capitalize">{s.role}</td>
                <td>{s.suspended ? <span className="pf-badge pf-badge-rejected">Suspended</span> : <span className="pf-muted">Active</span>}</td>
                <td className="pf-muted whitespace-nowrap">{formatDate(s.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="pf-panel space-y-2 p-5 text-[0.9375rem]">
        <h2 className="font-bold">Adding or removing a moderator</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Find the member on the{" "}
            <Link href="/admin/users" className="pf-link">
              Users page
            </Link>
            .
          </li>
          <li>Open their page and change their role. The change is written to the audit log and they are notified.</li>
          <li>Roles can&apos;t be changed on your own account, so the platform always keeps at least one admin.</li>
        </ol>
      </section>
    </>
  );
}

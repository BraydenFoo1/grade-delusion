import type { Metadata } from "next";
import Link from "next/link";
import ActivityChart from "@/components/platform/admin/ActivityChart";
import Icon from "@/components/platform/Icon";
import { Notice, PageHeader, Time } from "@/components/platform/ui";
import { staffPage } from "@/lib/auth/admin-page";
import { plural } from "@/lib/platform/format";
import { getOverview } from "@/lib/services/analytics";

export const metadata: Metadata = { title: "Admin overview" };

function Row({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="pf-muted">{label}</dt>
      <dd className="text-right font-semibold tabular-nums">
        {value}
        {note ? <span className="pf-muted ml-2 text-sm font-normal">{note}</span> : null}
      </dd>
    </div>
  );
}

export default async function AdminOverview() {
  const { actor, db } = await staffPage("/admin");
  const o = await getOverview(db, actor);
  const verifiedPct = o.users.total ? Math.round((o.users.verified / o.users.total) * 100) : 0;
  const allClear = o.queue.pending === 0 && o.reports.open === 0;

  return (
    <>
      <PageHeader title="Overview">How the community is doing, and what needs a human.</PageHeader>

      <section aria-labelledby="attention" className="space-y-3">
        <h2 id="attention" className="text-xl font-bold">
          Needs attention
        </h2>
        {allClear ? (
          <Notice tone="ok">Nothing is waiting. The queue is empty and there are no open reports.</Notice>
        ) : (
          <ul className="pf-card divide-y-2 divide-(--pf-line-soft) overflow-hidden">
            {o.queue.pending > 0 ? (
              <li>
                <Link href="/admin/queue" className="flex items-center gap-3 px-4 py-3.5 hover:bg-(--pf-sunken)">
                  <Icon name="inbox" size={20} />
                  <span className="flex-1">
                    <b>{plural(o.queue.pending, "post")}</b> waiting for review
                    {o.queue.oldestPendingAt ? (
                      <span className="pf-muted">
                        {" "}
                        · oldest submitted <Time date={o.queue.oldestPendingAt} />
                      </span>
                    ) : null}
                  </span>
                  <Icon name="next" size={18} />
                </Link>
              </li>
            ) : null}
            {o.reports.open > 0 ? (
              <li>
                <Link href="/admin/reports" className="flex items-center gap-3 px-4 py-3.5 hover:bg-(--pf-sunken)">
                  <Icon name="flag" size={20} />
                  <span className="flex-1">
                    <b>{plural(o.reports.open, "open report")}</b> to look at
                  </span>
                  <Icon name="next" size={18} />
                </Link>
              </li>
            ) : null}
          </ul>
        )}
      </section>

      <section className="pf-card p-5 sm:p-6">
        <ActivityChart
          title="Last 14 days"
          series={[
            { key: "signups", label: "Sign-ups", points: o.series.signups },
            { key: "submissions", label: "Submissions", points: o.series.submissions },
            { key: "approvals", label: "Approvals", points: o.series.approvals },
          ]}
        />
      </section>

      <section aria-labelledby="totals" className="space-y-3">
        <h2 id="totals" className="text-xl font-bold">
          In total
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <dl className="pf-card divide-y-2 divide-(--pf-line-soft) px-4 py-1">
            <Row label="Members" value={o.users.total} />
            <Row label="Confirmed e-mail" value={`${verifiedPct}%`} />
            <Row label="Joined this week" value={o.users.newThisWeek} />
            <Row label="Suspended" value={o.users.suspended} />
            <Row label="Staff" value={o.users.staff} />
          </dl>
          <dl className="pf-card divide-y-2 divide-(--pf-line-soft) px-4 py-1">
            <Row label="Live posts" value={o.posts.approved} />
            <Row label="In review" value={o.posts.pending} />
            <Row label="Not approved" value={o.posts.rejected} />
            <Row label="Removed" value={o.posts.removed} />
            <Row label="All submissions" value={o.posts.total} />
          </dl>
          <dl className="pf-card divide-y-2 divide-(--pf-line-soft) px-4 py-1">
            <Row label="Comments" value={o.comments.visible} note={o.comments.removed ? `${o.comments.removed} removed` : undefined} />
            <Row label="Reactions" value={o.reactions} />
            <Row label="Reports, all time" value={o.reports.total} />
            <Row label="Open reports" value={o.reports.open} />
          </dl>
        </div>
      </section>
    </>
  );
}

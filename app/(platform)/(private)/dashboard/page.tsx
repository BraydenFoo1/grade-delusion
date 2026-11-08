import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/platform/Icon";
import { EmptyState, LinkButton, Notice, StatusBadge, Time } from "@/components/platform/ui";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { isStaff } from "@/lib/platform/actor";
import { plural } from "@/lib/platform/format";
import { listNotifications } from "@/lib/services/notifications";
import { countOwnPostsByStatus, countPendingPosts, listOwnPosts } from "@/lib/services/posts";
import { countOpenReports } from "@/lib/services/reports";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const sp = await searchParams;
  const actor = await requireActor("/dashboard");
  const db = await getDb();
  const staff = isStaff(actor.role);
  const [counts, recent, notes, pending, reports] = await Promise.all([
    countOwnPostsByStatus(db, actor),
    listOwnPosts(db, actor, { page: 1 }),
    listNotifications(db, actor.id, { page: 1 }),
    staff ? countPendingPosts(db) : Promise.resolve(0),
    staff ? countOpenReports(db) : Promise.resolve(0),
  ]);
  const total = counts.pending + counts.approved + counts.rejected + counts.removed;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="pf-title [overflow-wrap:anywhere]">Hi, {actor.name}</h1>
        <p className="pf-muted text-[1.0625rem]">Here&apos;s what&apos;s happening with your delusions.</p>
      </header>

      {sp.welcome ? (
        <Notice tone="ok">
          <b>E-mail confirmed, welcome aboard.</b> You can now post, comment and react.
        </Notice>
      ) : null}

      {staff && (pending > 0 || reports > 0) ? (
        <section aria-label="Moderation" className="pf-panel flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <Icon name="shield" size={22} />
            <p className="font-semibold">
              {pending > 0 ? `${plural(pending, "post")} waiting for review` : "Review queue is empty"}
              {reports > 0 ? ` · ${plural(reports, "open report")}` : ""}
            </p>
          </div>
          <LinkButton href={pending > 0 ? "/admin/queue" : "/admin/reports"} variant="primary" small>
            Open the review desk
          </LinkButton>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="mine" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="mine" className="text-xl font-bold">
              Your submissions
            </h2>
            <LinkButton href="/submit" variant="primary" small>
              <Icon name="plus" size={16} /> New
            </LinkButton>
          </div>
          {total > 0 ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.9375rem]">
              {(["approved", "pending", "rejected", "removed"] as const)
                .filter((s) => counts[s] > 0)
                .map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <b className="tabular-nums">{counts[s]}</b> <StatusBadge status={s} />
                  </span>
                ))}
            </p>
          ) : null}
          {recent.items.length === 0 ? (
            <EmptyState icon="pencil" title="Nothing submitted yet" action={<LinkButton href="/submit" variant="primary">Write your first delusion</LinkButton>}>
              Tell us the confident thing you said before the exam. A moderator will read it, then it goes live.
            </EmptyState>
          ) : (
            <ul className="pf-card divide-y-2 divide-(--pf-line-soft) overflow-hidden">
              {recent.items.slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-start gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 [overflow-wrap:anywhere]">{p.body}</p>
                    <p className="pf-muted mt-1 text-sm">
                      <Time date={p.createdAt} />
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
          {total > 4 ? (
            <Link href="/my-submissions" className="pf-link inline-block text-sm">
              See all {total} submissions
            </Link>
          ) : null}
        </section>

        <section aria-labelledby="alerts" className="space-y-4">
          <h2 id="alerts" className="text-xl font-bold">
            Latest notifications
          </h2>
          {notes.rows.length === 0 ? (
            <EmptyState icon="bell" title="Nothing new">
              Approvals and replies will show up here.
            </EmptyState>
          ) : (
            <ul className="pf-card divide-y-2 divide-(--pf-line-soft) overflow-hidden">
              {notes.rows.slice(0, 4).map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <p className={n.readAt ? "pf-muted [overflow-wrap:anywhere]" : "font-semibold [overflow-wrap:anywhere]"}>{n.message}</p>
                  <p className="pf-muted mt-0.5 text-sm">
                    <Time date={n.createdAt} />
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/notifications" className="pf-link inline-block text-sm">
            All notifications
          </Link>
        </section>
      </div>
    </div>
  );
}

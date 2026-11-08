import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RoleForm, UserModerationPanel } from "@/components/platform/admin/AdminActions";
import Icon from "@/components/platform/Icon";
import { Avatar, Notice, StatusBadge, Time } from "@/components/platform/ui";
import { staffPage } from "@/lib/auth/admin-page";
import { canActOnUser, canChangeRole, isAdmin } from "@/lib/platform/actor";
import { formatDate, formatDateTime, plural } from "@/lib/platform/format";
import { listModerationHistory } from "@/lib/services/audit";
import { listPostsForStaff } from "@/lib/services/posts";
import { getUserDetail } from "@/lib/services/users";

export const metadata: Metadata = { title: "User" };

const ACTION_LABEL: Record<string, string> = {
  post_approved: "Approved a post",
  post_rejected: "Rejected a post",
  post_removed: "Removed a post",
  post_restored: "Restored a post",
  comment_removed: "Removed a comment",
  comment_restored: "Restored a comment",
  report_resolved: "Resolved a report",
  report_dismissed: "Dismissed a report",
  user_suspended: "Suspended the account",
  user_banned: "Banned the account",
  user_restored: "Restored the account",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="pf-muted">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, db } = await staffPage(`/admin/users/${id}`);
  const u = await getUserDetail(db, actor, id);
  if (!u) notFound();
  const [history, posts] = await Promise.all([
    listModerationHistory(db, actor, { type: "user", id }),
    listPostsForStaff(db, actor, { authorId: id, page: 1 }),
  ]);
  const canAct = canActOnUser(actor, { id: u.id, role: u.role });
  const admin = isAdmin(actor.role);

  return (
    <>
      <Link href="/admin/users" className="pf-link inline-flex items-center gap-1.5 text-sm">
        <Icon name="back" size={16} /> All users
      </Link>
      <header className="flex flex-wrap items-center gap-4">
        <Avatar name={u.name} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="pf-title [overflow-wrap:anywhere]">{u.name}</h1>
          <p className="pf-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="pf-badge pf-badge-info capitalize">{u.role}</span>
            {u.suspended ? <span className="pf-badge pf-badge-rejected">{u.banExpires ? "Suspended" : "Banned"}</span> : null}
            <span>Joined {formatDate(u.createdAt)}</span>
            {!u.suspended ? (
              <Link href={`/u/${u.id}`} className="pf-link">
                Public profile
              </Link>
            ) : null}
          </p>
        </div>
      </header>

      {u.suspended ? (
        <Notice tone="error">
          <b>{u.banExpires ? `Suspended until ${formatDateTime(u.banExpires)}` : "Banned permanently"}.</b> {u.banReason ? `Reason: ${u.banReason}` : null}
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <dl className="pf-card divide-y-2 divide-(--pf-line-soft) px-4 py-1">
          <Row label="E-mail">
            <span className="[overflow-wrap:anywhere]">{u.email}</span>
            {!u.emailVerified ? <span className="pf-muted text-sm font-normal"> (unconfirmed)</span> : null}
          </Row>
          <Row label="Live posts">{u.posts.approved}</Row>
          <Row label="In review">{u.posts.pending}</Row>
          <Row label="Not approved / removed">
            {u.posts.rejected} / {u.posts.removed}
          </Row>
          <Row label="Comments">{u.comments}</Row>
          <Row label="Reports against them">
            {u.reportsAgainst.total}
            {u.reportsAgainst.open ? <span className="pf-error-text text-sm"> ({u.reportsAgainst.open} open)</span> : null}
          </Row>
          <Row label="Reports they filed">{u.reportsFiled}</Row>
        </dl>

        <section aria-labelledby="mod" className="pf-card space-y-4 p-5">
          <h2 id="mod" className="text-xl font-bold">
            Account actions
          </h2>
          <UserModerationPanel userId={u.id} suspended={u.suspended} canAct={canAct} />
          {admin ? (
            <>
              <hr className="pf-hair border-t-2" />
              <RoleForm userId={u.id} role={u.role} canChange={canChangeRole(actor, { id: u.id, role: u.role }, u.role === "user" ? "moderator" : "user")} />
            </>
          ) : null}
        </section>
      </div>

      <section aria-labelledby="posts" className="space-y-3">
        <h2 id="posts" className="text-xl font-bold">
          Recent posts
        </h2>
        {posts.items.length === 0 ? (
          <p className="pf-muted">No posts yet.</p>
        ) : (
          <ul className="pf-card divide-y-2 divide-(--pf-line-soft) overflow-hidden">
            {posts.items.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-start gap-3 px-4 py-3">
                <p className="line-clamp-2 min-w-0 flex-1 [overflow-wrap:anywhere]">{p.body}</p>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
        {posts.total > 6 ? (
          <Link href={`/admin/posts?q=${encodeURIComponent(u.name)}`} className="pf-link text-sm">
            See all {plural(posts.total, "post")}
          </Link>
        ) : null}
      </section>

      <section aria-labelledby="history" className="space-y-3">
        <h2 id="history" className="text-xl font-bold">
          Moderation history
        </h2>
        {history.length === 0 ? (
          <p className="pf-muted">No moderation actions involve this user yet.</p>
        ) : (
          <ol className="pf-card divide-y-2 divide-(--pf-line-soft) overflow-hidden">
            {history.map((h) => (
              <li key={h.id} className="px-4 py-3">
                <p className="font-semibold">{ACTION_LABEL[h.action] ?? h.action}</p>
                <p className="pf-muted text-sm">
                  by {h.actorName} · <Time date={h.createdAt} />
                </p>
                {h.note ? <p className="mt-1 text-[0.9375rem]">Note: {h.note}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

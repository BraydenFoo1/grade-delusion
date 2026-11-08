import type { ReactNode } from "react";
import AdminNav, { type AdminNavItem } from "@/components/platform/admin/AdminNav";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { isAdmin, isStaff } from "@/lib/platform/actor";
import { countPendingPosts } from "@/lib/services/posts";
import { countOpenReports } from "@/lib/services/reports";

/**
 * The admin chrome (navigation with live counts). This layout deliberately does NOT redirect or 404 by
 * itself: every admin page runs its own staffPage()/adminPage() guard, which is the real security check
 * (layouts don't re-run on client-side navigation) and also remembers the exact page to return to after
 * sign-in. For anyone who isn't staff this just renders the page, which immediately redirects or 404s.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await getActor();
  if (!actor || !isStaff(actor.role)) return children;

  const db = await getDb();
  const [pending, reports] = await Promise.all([countPendingPosts(db), countOpenReports(db)]);
  const items: AdminNavItem[] = [
    { href: "/admin", label: "Overview", icon: "chart" },
    { href: "/admin/queue", label: "Review queue", icon: "inbox", badge: pending },
    { href: "/admin/reports", label: "Reports", icon: "flag", badge: reports },
    { href: "/admin/posts", label: "Posts", icon: "list" },
    { href: "/admin/comments", label: "Comments", icon: "chat" },
    { href: "/admin/users", label: "Users", icon: "users" },
    ...(isAdmin(actor.role)
      ? ([
          { href: "/admin/moderators", label: "Moderators", icon: "shield" },
          { href: "/admin/audit", label: "Audit log", icon: "clock" },
          { href: "/admin/settings", label: "Settings", icon: "gear" },
        ] as AdminNavItem[])
      : []),
  ];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <AdminNav items={items} />
      <div className="min-w-0 space-y-8">{children}</div>
    </div>
  );
}

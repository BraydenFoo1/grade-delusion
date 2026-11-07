"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Icon, { type IconName } from "../Icon";

export type AdminNavItem = { href: string; label: string; icon: IconName; badge?: number };

/** Sidebar on desktop, a horizontally scrolling strip on phones. */
export default function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="lg:sticky lg:top-24">
      <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 rounded-xl border-2 px-3.5 text-[0.9375rem] font-bold transition-colors",
                  active ? "border-(--pf-line) bg-(--pf-fg) text-(--pf-bg)" : "border-transparent hover:bg-(--pf-sunken)",
                )}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto grid min-w-6 place-items-center rounded-full border-2 border-(--pf-ink) bg-(--sun) px-1.5 text-xs font-extrabold leading-5 text-(--pf-ink)">
                    {item.badge > 99 ? "99+" : item.badge}
                    <span className="sr-only"> waiting</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import Icon, { type IconName } from "./Icon";
import { Avatar } from "./ui";

export type NavItem = { href: string; label: string; icon: IconName; primary?: boolean };

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

/** Desktop navigation: current page marked with aria-current. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className="pf-chip border-transparent bg-transparent aria-[current=page]:border-(--pf-line)"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Mobile navigation: a bottom tab bar within thumb reach. The primary action sits in the middle. */
export function BottomTabs({ items, unread }: { items: NavItem[]; unread: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-(--pf-line) bg-(--pf-surface) pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[0.6875rem] font-bold",
                  active ? "text-(--pf-fg)" : "pf-muted",
                )}
              >
                {item.primary ? (
                  <span className="-mt-5 grid size-12 place-items-center rounded-full border-2 border-(--pf-ink) bg-(--sun) text-(--pf-ink) shadow-[3px_3px_0_var(--pf-shadow)]">
                    <Icon name={item.icon} size={24} />
                  </span>
                ) : (
                  <span className="relative">
                    <Icon name={item.icon} size={22} />
                    {item.href === "/notifications" && unread > 0 ? (
                      <span aria-hidden className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-(--hot) px-1 text-[0.625rem] font-extrabold leading-4 text-(--pf-ink)">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    ) : null}
                  </span>
                )}
                <span>{item.label}</span>
                {item.href === "/notifications" && unread > 0 ? <span className="sr-only">, {unread} unread</span> : null}
                {active && !item.primary ? <span aria-hidden className="absolute inset-x-5 top-0 h-[3px] rounded-b bg-(--hot)" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The bell: starts from the server's count, then refreshes when the tab regains focus and once a minute. */
export function NotificationBell({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  useEffect(() => setCount(initial), [initial]);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const res = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (res.ok && alive) setCount((await res.json()).count ?? 0);
      } catch {
        /* offline: keep the last known count */
      }
    };
    const id = window.setInterval(refresh, 60_000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return (
    <Link href="/notifications" className="pf-btn pf-btn-ghost relative !min-h-11 !min-w-11 !p-0">
      <Icon name="bell" size={22} />
      {/* The name comes from real text, not an aria-label: the visible badge says "9+" for big counts, and
          WCAG 2.5.3 wants the visible text to be part of the accessible name. */}
      <span className="sr-only">{count > 0 ? `Notifications, ${count} unread` : "Notifications"}</span>
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 grid min-w-[1.1rem] place-items-center rounded-full border-2 border-(--pf-bg) bg-(--hot) px-1 text-[0.6875rem] font-extrabold leading-4 text-(--pf-ink)"
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}

/** Light / dark. Without a choice the page follows the system; a choice is remembered on this device. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const pinned = document.documentElement.dataset.pfTheme;
    setDark(pinned ? pinned === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.pfTheme = next;
    try {
      localStorage.setItem("gd-theme", next);
    } catch {
      /* private mode: the choice just won't persist */
    }
    setDark(!dark);
  };
  return (
    <button type="button" onClick={toggle} className="pf-btn pf-btn-ghost !min-h-11 !min-w-11 !p-0" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>
      <Icon name={dark ? "sun" : "moon"} size={20} />
    </button>
  );
}

export function SignOutButton({ className, children = "Sign out" }: { className?: string; children?: React.ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}

/** Account menu. A native <details>, closed with Escape or by clicking elsewhere. */
export function AccountMenu({ name, role, staff }: { name: string; role: string; staff: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e instanceof MouseEvent && ref.current?.contains(e.target as Node)) return;
      ref.current?.removeAttribute("open");
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  const item = "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[0.9375rem] font-semibold hover:bg-(--pf-sunken)";
  return (
    <details ref={ref} className="relative">
      {/* No aria-label: the name comes from real content (WCAG 2.5.3 wants the visible text inside the name). */}
      <summary className="pf-btn pf-btn-ghost cursor-pointer list-none !p-1 [&::-webkit-details-marker]:hidden">
        <Avatar name={name} size={34} />
        <span className="sr-only">Account menu for {name}</span>
        <span aria-hidden className="hidden max-w-32 truncate pr-1 text-sm lg:inline">
          {name}
        </span>
      </summary>
      <div className="pf-card pf-lift absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 p-2">
        <div className="px-3 pb-2 pt-1">
          <p className="truncate font-bold">{name}</p>
          <p className="pf-muted text-sm capitalize">{role}</p>
        </div>
        <hr className="pf-hair my-1 border-t-2" />
        <Link href="/dashboard" className={item}>
          <Icon name="home" size={18} /> Dashboard
        </Link>
        <Link href="/my-submissions" className={item}>
          <Icon name="list" size={18} /> My submissions
        </Link>
        <Link href="/activity" className={item}>
          <Icon name="clock" size={18} /> Activity
        </Link>
        <Link href="/settings" className={item}>
          <Icon name="gear" size={18} /> Settings
        </Link>
        {staff ? (
          <Link href="/admin" className={item}>
            <Icon name="shield" size={18} /> Admin
          </Link>
        ) : null}
        <hr className="pf-hair my-1 border-t-2" />
        <SignOutButton className={item}>
          <Icon name="logout" size={18} /> Sign out
        </SignOutButton>
      </div>
    </details>
  );
}

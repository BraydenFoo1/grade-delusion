import Link from "next/link";
import Logo from "@/components/Logo";
import type { Actor } from "@/lib/platform/actor";
import { isStaff } from "@/lib/platform/actor";
import { legal } from "@/lib/site";
import Icon from "./Icon";
import { AccountMenu, BottomTabs, NavLinks, NotificationBell, ThemeToggle, type NavItem } from "./ShellClient";
import { buttonClass } from "./ui";

function navFor(actor: Actor | null): { desktop: NavItem[]; mobile: NavItem[] } {
  if (!actor) {
    return {
      desktop: [{ href: "/community", label: "Community", icon: "users" }],
      mobile: [
        { href: "/community", label: "Community", icon: "users" },
        { href: "/sign-in", label: "Sign in", icon: "user" },
        { href: "/sign-up", label: "Join", icon: "plus", primary: true },
      ],
    };
  }
  const staff = isStaff(actor.role);
  return {
    desktop: [
      { href: "/community", label: "Community", icon: "users" },
      { href: "/dashboard", label: "Dashboard", icon: "home" },
      { href: "/submit", label: "Submit", icon: "plus" },
      ...(staff ? [{ href: "/admin", label: "Admin", icon: "shield" } as NavItem] : []),
    ],
    mobile: [
      { href: "/community", label: "Community", icon: "users" },
      { href: "/dashboard", label: "Home", icon: "home" },
      { href: "/submit", label: "Submit", icon: "plus", primary: true },
      { href: "/notifications", label: "Alerts", icon: "bell" },
      staff ? { href: "/admin", label: "Admin", icon: "shield" } : { href: "/settings", label: "Me", icon: "user" },
    ],
  };
}

export function PlatformHeader({ actor, unread }: { actor: Actor | null; unread: number }) {
  const nav = navFor(actor);
  return (
    <>
      <a href="#content" className="sr-only z-[100] rounded-lg bg-(--pf-fg) px-4 py-2 font-bold text-(--pf-bg) focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b-2 border-(--pf-line) bg-(--pf-bg)">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <Logo href="/" className="max-[359px]:text-base" />
          <div className="ml-2 flex-1">
            <NavLinks items={nav.desktop} />
          </div>
          <ThemeToggle />
          {actor ? (
            <>
              {/* On phones the bottom tab bar already has an "Alerts" tab with the unread badge. */}
              <div className="hidden md:block">
                <NotificationBell initial={unread} />
              </div>
              <AccountMenu name={actor.name} role={actor.role} staff={isStaff(actor.role)} />
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/sign-in" className={buttonClass("ghost", true)}>
                Sign in
              </Link>
              <Link href="/sign-up" className={buttonClass("primary", true)}>
                Join
              </Link>
            </div>
          )}
        </div>
      </header>
      <BottomTabs items={nav.mobile} unread={unread} />
    </>
  );
}

export function PlatformFooter() {
  return (
    <footer className="border-t-2 border-(--pf-line-soft) pb-28 pt-8 md:pb-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 text-sm sm:px-6">
        <p className="pf-muted">
          Grade Delusion™ is just for laughs. Real support comes from{" "}
          <a href="https://gradesolution.com.sg" className="pf-link" rel="noopener">
            Grade Solution
          </a>
          .
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 font-semibold">
          <li>
            <Link href="/" className="pf-link">
              Home
            </Link>
          </li>
          <li>
            <Link href={legal.privacy} className="pf-link">
              Privacy
            </Link>
          </li>
          <li>
            <Link href={legal.terms} className="pf-link">
              Terms
            </Link>
          </li>
          <li>
            <Link href={`${legal.terms}#community`} className="pf-link">
              Community rules
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}

/** Admin-controlled banner (platform configuration → announcement). */
export function AnnouncementBanner({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="border-b-2 border-(--pf-ink) bg-(--sun) text-(--pf-ink)" role="status">
      <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm font-bold sm:px-6">
        <Icon name="info" size={18} className="shrink-0" />
        <span className="min-w-0 [overflow-wrap:anywhere]">{text}</span>
      </p>
    </div>
  );
}

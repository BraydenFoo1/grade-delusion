import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { formatDateTime, timeAgo } from "@/lib/platform/format";
import { cn } from "@/lib/utils";
import Icon, { type IconName } from "./Icon";

/* ------------------------------------------------------------------ */
/* Buttons                                                            */
/* ------------------------------------------------------------------ */

type Variant = "default" | "primary" | "ok" | "danger" | "ghost";
const variantClass: Record<Variant, string> = {
  default: "",
  primary: "pf-btn-primary",
  ok: "pf-btn-ok",
  danger: "pf-btn-danger",
  ghost: "pf-btn-ghost",
};

export function buttonClass(variant: Variant = "default", small = false, extra?: string) {
  return cn("pf-btn", variantClass[variant], small && "pf-btn-sm", extra);
}

export function Button({
  variant = "default",
  small,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean; loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      data-loading={loading ? "true" : undefined}
      aria-busy={loading || undefined}
      className={buttonClass(variant, small, className)}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "default",
  small,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  small?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, small, className)}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Status, identity, time                                             */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  pending: "In review",
  approved: "Live",
  rejected: "Not approved",
  removed: "Removed",
  visible: "Visible",
  open: "Open",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "pending" || status === "open"
      ? "pf-badge-pending"
      : status === "approved" || status === "resolved" || status === "visible"
        ? "pf-badge-approved"
        : status === "rejected"
          ? "pf-badge-rejected"
          : status === "removed" || status === "dismissed"
            ? "pf-badge-removed"
            : "";
  return <span className={cn("pf-badge", tone)}>{STATUS_LABEL[status] ?? status}</span>;
}

const AVATAR_TINTS = ["var(--sun)", "var(--mint)", "var(--hot)", "#9db0ff"];

/** Initials on a brand tint picked from the name, so the same person always looks the same. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => Array.from(w)[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full border-2 font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: AVATAR_TINTS[h % AVATAR_TINTS.length],
        color: "var(--pf-ink)",
        borderColor: "var(--pf-ink)",
      }}
    >
      {initials || "?"}
    </span>
  );
}

export function Time({ date, className }: { date: Date | string; className?: string }) {
  const d = new Date(date);
  return (
    <time dateTime={d.toISOString()} title={formatDateTime(d)} className={className}>
      {timeAgo(d)}
    </time>
  );
}

/* ------------------------------------------------------------------ */
/* Page furniture                                                     */
/* ------------------------------------------------------------------ */

export function PageHeader({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="pf-title">{title}</h1>
        {children ? <div className="pf-muted mt-2 max-w-[60ch] text-[1.0625rem]">{children}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Empty states teach what to do next instead of just saying "nothing here". */
export function EmptyState({
  icon = "inbox",
  title,
  children,
  action,
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="pf-panel flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full border-2 border-(--pf-line) bg-(--pf-surface)">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-lg font-bold">{title}</p>
      {children ? <div className="pf-muted max-w-[44ch]">{children}</div> : null}
      {action}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
  className,
  role,
}: {
  tone?: "info" | "ok" | "error";
  children: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  const icon: IconName = tone === "error" ? "alert" : tone === "ok" ? "check" : "info";
  return (
    <div className={cn("pf-notice", `pf-notice-${tone}`, className)} role={role ?? (tone === "error" ? "alert" : "status")}>
      <Icon name={icon} size={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (page: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={buttonClass("default", true)} rel="prev">
          <Icon name="back" size={16} /> Newer
        </Link>
      ) : (
        <span />
      )}
      <p className="pf-muted text-sm" aria-live="polite">
        Page {page} of {pageCount}
      </p>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={buttonClass("default", true)} rel="next">
          Older <Icon name="next" size={16} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("pf-skeleton", className)} />;
}

/** A labelled form field with an inline error. `error` is shown under the control and wired to it for screen readers. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="pf-label">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="pf-muted mt-1.5 text-sm">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="pf-error-text mt-1.5 text-sm font-semibold">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** aria props that connect a control to its Field hint/error. */
export const describe = (id: string, error?: string, hint?: boolean) => ({
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
});

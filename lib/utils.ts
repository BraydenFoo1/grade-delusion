import type { CSSProperties } from "react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Typed helper for passing CSS custom properties through `style`. */
export function vars(values: Record<`--${string}`, string | number>): CSSProperties {
  return values as CSSProperties;
}

/** Locale-independent thousands separator (avoids hydration mismatches). */
export function formatCount(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

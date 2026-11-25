import type { KeyboardEvent } from "react";

/** True when the visitor asked for reduced motion or paused animations with the site's own button. */
export function motionReduced(): boolean {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.motion === "paused"
  );
}

/** Arrow / Home / End keyboard support for a horizontal tab list (roving focus). */
export function handleTabKeys(
  e: KeyboardEvent,
  index: number,
  count: number,
  select: (i: number) => void,
  idPrefix: string,
): void {
  let next = index;
  if (e.key === "ArrowRight") next = (index + 1) % count;
  else if (e.key === "ArrowLeft") next = (index - 1 + count) % count;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = count - 1;
  else return;
  e.preventDefault();
  select(next);
  document.getElementById(`${idPrefix}-tab-${next}`)?.focus();
}

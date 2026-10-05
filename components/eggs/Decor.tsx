import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Purely decorative secrets: hidden from screen readers and never clickable,
// so they can't block real UI.

type Props = { children: ReactNode; className?: string };

// Use the caller's display class (e.g. "hidden md:inline-block") instead of the default when one is given.
const ownsDisplay = (className = "") => /(^|\s)(hidden|block|flex|inline-flex|inline-block|grid)(\s|$)/.test(className);

/** Tiny handwritten student thought. */
export function Note({ children, className }: Props) {
  return (
    <span aria-hidden className={cn("pointer-events-none select-none font-hand leading-none", className)}>
      {children}
    </span>
  );
}

/** Mini rubber stamp / sticker. */
export function MiniStamp({ children, className }: Props) {
  return (
    <span
      aria-hidden
      className={cn(
        !ownsDisplay(className) && "inline-block",
        "pointer-events-none select-none rounded-md border-2 border-ink px-1.5 pb-0.5 pt-1 font-display text-[0.72rem] uppercase leading-none tracking-wider text-ink shadow-[2px_2px_0_var(--ink)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Fake academic warning label. */
export function Warning({ children, className }: Props) {
  return (
    <span
      aria-hidden
      className={cn(
        !ownsDisplay(className) && "inline-flex",
        "pointer-events-none select-none items-center gap-1.5 font-mono text-[0.62rem] font-bold uppercase tracking-[0.16em]",
        className,
      )}
    >
      <span className="text-[0.8rem] leading-none">⚠</span>
      {children}
    </span>
  );
}

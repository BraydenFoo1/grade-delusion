"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Pauses all looping animations (marquee, floating doodles, wiggles).
 *  Satisfies WCAG 2.2.2 (Pause, Stop, Hide). Starts paused for visitors
 *  whose OS asks for reduced motion. Nothing is stored. */
export default function MotionToggle({ className }: { className?: string }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setPaused(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (paused) root.dataset.motion = "paused";
    else delete root.dataset.motion;
  }, [paused]);

  return (
    <button
      type="button"
      onClick={() => setPaused((p) => !p)}
      aria-pressed={paused}
      aria-label="Pause animations"
      title={paused ? "Play animations" : "Pause animations"}
      className={cn(
        "grid size-11 place-items-center rounded-xl border-[3px] border-ink transition-colors",
        paused ? "bg-ink text-sun" : "bg-paper hover:bg-sun",
        className,
      )}
    >
      {paused ? (
        <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
          <path d="M4 2.5v11l9-5.5z" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
          <rect x="3" y="2.5" width="3.5" height="11" rx="1" />
          <rect x="9.5" y="2.5" width="3.5" height="11" rx="1" />
        </svg>
      )}
    </button>
  );
}

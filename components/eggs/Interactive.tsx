"use client";

import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { Star } from "../ui/Doodles";
import { useEggs, type EggId } from "./EggProvider";
import { cn } from "@/lib/utils";

function useAutoHide(ms: number) {
  const [shown, setShown] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = () => {
    setShown(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown(false), ms);
  };
  return { shown, show, hide: () => setShown(false) };
}

/** Comic speech bubble used by the interactive secrets. */
function Bubble({ children, align, side }: { children: ReactNode; align: "left" | "right"; side: "top" | "bottom" }) {
  return (
    <span
      className={cn(
        "egg-bubble pop block w-max max-w-[15rem]",
        side === "bottom" ? "egg-bubble-down" : "egg-bubble-up",
        align === "right" ? "egg-tail-right" : "egg-tail-left",
      )}
    >
      {children}
    </span>
  );
}

/** A decoration that turns out to be a button. Click (or Enter/Space) reveals a message. */
export function EggReveal({
  id,
  label,
  message,
  children,
  className,
  align = "right",
  side = "bottom",
}: {
  id: EggId;
  label: string;
  message: ReactNode;
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
  side?: "top" | "bottom";
}) {
  const { find } = useEggs();
  const { shown, show, hide } = useAutoHide(5000);
  return (
    <span className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          find(id, e.currentTarget);
          if (shown) hide();
          else show();
        }}
        className="grid min-h-6 min-w-6 cursor-pointer touch-manipulation place-items-center transition-transform duration-200 hover:scale-110 active:scale-90"
      >
        {children}
      </button>
      <span
        aria-live="polite"
        className={cn(
          "absolute z-30",
          side === "bottom" ? "top-full mt-3" : "bottom-full mb-3",
          align === "right" ? "right-0" : "left-0",
        )}
      >
        {shown && (
          <Bubble align={align} side={side}>
            {message}
          </Bubble>
        )}
      </span>
    </span>
  );
}

/** Handwritten note that changes once you click it. */
export function FlipNote({ id, before, after, className }: { id: EggId; before: string; after: string; className?: string }) {
  const { find } = useEggs();
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        setFlipped(true);
        find(id, e.currentTarget);
      }}
      className={cn(
        "cursor-pointer touch-manipulation whitespace-nowrap font-hand leading-none transition-transform hover:-rotate-1",
        flipped && "text-sun",
        className,
      )}
    >
      <span aria-live="polite">{flipped ? after : before}</span>
    </button>
  );
}

/** Sticker that reveals its fine print on hover, focus or tap. */
export function RevealSticker({
  id,
  front,
  back,
  className,
}: {
  id: EggId;
  front: string;
  back: string;
  className?: string;
}) {
  const { find } = useEggs();
  const { shown, show, hide } = useAutoHide(3500);
  const reveal = (e: SyntheticEvent) => {
    show();
    find(id, e.currentTarget);
  };
  return (
    <span className={cn("inline-block", className)} onMouseEnter={reveal} onMouseLeave={hide}>
      <span className="relative inline-block">
        <button
          type="button"
          onClick={reveal}
          onFocus={reveal}
          onBlur={hide}
          className="stamp cursor-help touch-manipulation bg-mint px-2.5 py-1.5 text-sm transition-transform hover:rotate-0 sm:text-base"
          style={{ rotate: "7deg" }}
        >
          {front}
        </button>
        <span aria-live="polite" className="absolute bottom-full right-0 z-30 mb-2">
          {shown && (
            <Bubble align="right" side="top">
              {back}
            </Bubble>
          )}
        </span>
      </span>
    </span>
  );
}

/** A star that keeps count of how much delusion you've collected. */
export function StarEgg({ id, starClassName }: { id: EggId; starClassName?: string }) {
  const { find } = useEggs();
  const [count, setCount] = useState(0);
  const { shown, show } = useAutoHide(2200);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-label="Suspicious star"
        onClick={(e) => {
          setCount((c) => c + 1);
          show();
          find(id, e.currentTarget);
        }}
        className="grid cursor-pointer touch-manipulation place-items-center active:scale-90"
      >
        <Star className={cn("transition-[rotate] duration-500", starClassName)} style={{ rotate: `${count * 144}deg` }} />
      </button>
      <span aria-live="polite" className="absolute right-0 top-full z-30 mt-1">
        {shown && (
          <span
            key={count}
            className="pop block whitespace-nowrap rounded-lg border-2 border-ink bg-ink px-2 py-1 font-display text-sm uppercase tracking-wide text-sun"
          >
            ⭐ +{count} delusion
          </span>
        )}
      </span>
    </span>
  );
}

/** Marks a secret as found when it first appears (for behaviour-based secrets). */
export function FoundOnMount({ id, children, className }: { id: EggId; children: ReactNode; className?: string }) {
  const { find } = useEggs();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => find(id, ref.current), [find, id]);
  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
}

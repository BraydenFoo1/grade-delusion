"use client";

import { useRef, useState } from "react";
import { BurstLayer, Sparkle, Star } from "../ui/Doodles";
import { useBurst } from "@/lib/hooks";
import { useEggs } from "./EggProvider";
import { cn } from "@/lib/utils";

const CLICKS_NEEDED = 5;
const MAX_GAP_MS = 1500; // clicks further apart than this start the count again

/** The ™ next to the logo. Looks like a trademark symbol. Click it 5 times quickly. */
export default function TrademarkEgg({ className }: { className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const clicks = useRef(0);
  const lastClick = useRef(0);
  const [tilt, setTilt] = useState(false);
  const [round, setRound] = useState(0);
  const { parts, fire } = useBurst();
  const { find } = useEggs();

  const onClick = () => {
    const now = Date.now();
    clicks.current = now - lastClick.current > MAX_GAP_MS ? 1 : clicks.current + 1;
    lastClick.current = now;
    setTilt((t) => !t);
    if (clicks.current < CLICKS_NEEDED) return;
    clicks.current = 0;
    setRound((r) => r + 1);
    dialogRef.current?.showModal();
    find("tm");
    window.setTimeout(() => fire(["⭐", "✨", "🧠", "💀", "🎓"], 22, 240), 200);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label="Trademark"
        className={cn(
          // 24×24 tap target (WCAG 2.5.8); negative margins keep the original footprint
          "-mb-3 -mr-4 grid min-h-6 min-w-6 cursor-default touch-manipulation select-none place-items-start leading-none transition-[rotate] duration-150",
          className,
        )}
        style={{ rotate: tilt ? "10deg" : "0deg" }}
      >
        ™
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="absolute-delusion-title"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-auto w-[min(92vw,34rem)] overflow-visible bg-transparent p-0 font-sans text-base normal-case leading-normal tracking-normal text-ink backdrop:bg-ink/80"
      >
        <div
          key={round}
          className="dots pop relative rounded-[2rem] border-[3px] border-ink bg-sun px-6 py-10 text-center shadow-[10px_10px_0_var(--hot)] sm:px-10"
        >
          <Star className="absolute -left-4 -top-5 size-12 -rotate-12 text-paper" />
          <Sparkle className="absolute -right-3 top-10 size-9 text-mint" />
          <BurstLayer parts={parts} />
          <p className="text-xs font-bold uppercase tracking-[0.25em]">Secret unlocked</p>
          <h2
            id="absolute-delusion-title"
            className="mt-4 font-display text-[clamp(2.1rem,8vw,3.4rem)] uppercase leading-[0.92]"
          >
            Congratulations.
            <br />
            You have achieved
            <br />
            <span className="brush mt-1">absolute delusion.</span>
          </h2>
          <p className="mt-7 font-marker text-xl sm:text-2xl">There is no prize.</p>
          <form method="dialog">
            <button type="submit" autoFocus className="brutal-btn mt-8 bg-ink text-sun [--btn-shadow:var(--paper)]">
              Close
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motionReduced } from "./shared";
import { EIGHT_BALL_ANSWERS, nextAnswerIndex } from "@/lib/toys";
import { cn } from "@/lib/utils";

const SHAKE_MS = 650;

export default function ExamEightBall() {
  const [answer, setAnswer] = useState<number | null>(null);
  const [shaking, setShaking] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const ask = () => {
    if (shaking) return;
    const pickNext = () => setAnswer((prev) => nextAnswerIndex(prev));
    if (motionReduced()) {
      pickNext();
      return;
    }
    setShaking(true);
    timer.current = window.setTimeout(() => {
      pickNext();
      setShaking(false);
    }, SHAKE_MS);
  };

  return (
    <div className="text-center">
      <p className="text-sm font-bold text-ink/70">Think of the one topic you’re praying will come out. Tap the ball.</p>
      <button
        type="button"
        onClick={ask}
        aria-label="Shake the exam magic 8-ball"
        className={cn(
          "mx-auto mt-5 grid size-52 place-items-center rounded-full border-[4px] border-ink bg-ink text-paper shadow-[8px_8px_0_var(--hot)] transition-transform active:scale-95 sm:size-60",
          shaking && "ball-shake",
        )}
      >
        <span className="grid size-24 place-items-center rounded-full bg-paper font-display text-6xl text-ink sm:size-28" aria-hidden>
          8
        </span>
      </button>
      <div className="mt-6 min-h-24 rounded-2xl border-[3px] border-ink bg-sun p-4" role="status" aria-live="polite">
        {shaking ? (
          <p className="font-marker text-xl">Consulting the cher spirits…</p>
        ) : answer === null ? (
          <p className="font-marker text-xl text-ink/60">Ask, and the ball shall judge you.</p>
        ) : (
          <p className="font-marker text-2xl leading-snug">{EIGHT_BALL_ANSWERS[answer]}</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useId, useState } from "react";
import { dustOMeter, TYS_MAX_PAGES, TYS_STEP } from "@/lib/toys";

export default function DustOMeter() {
  const [bought, setBought] = useState(600);
  const [done, setDone] = useState(40);
  const boughtId = useId();
  const doneId = useId();
  const result = dustOMeter(bought, done);

  const slider = (id: string, label: string, value: number, set: (n: number) => void) => (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-bold uppercase tracking-wide">
        <span>{label}</span>
        <output htmlFor={id} className="font-display text-2xl tabular-nums">
          {value}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={TYS_MAX_PAGES}
        step={TYS_STEP}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="mt-2 h-3 w-full cursor-pointer accent-[var(--hot)]"
      />
    </div>
  );

  return (
    <div>
      <p className="text-center text-sm font-bold text-ink/70">How much TYS did you buy, and how much did you actually do?</p>
      <div className="mt-5 grid gap-6">
        {slider(boughtId, "Pages of TYS bought", bought, setBought)}
        {slider(doneId, "Pages actually done", done, (n) => setDone(Math.min(n, bought)))}
      </div>
      <div className="mt-6 rounded-2xl border-[3px] border-ink bg-sun p-4 text-center" role="status" aria-live="polite" aria-atomic="true">
        <p className="text-xs font-bold uppercase tracking-[0.2em]">Academic Delusion Score</p>
        <p className="font-display text-7xl tabular-nums leading-none">
          {result.score}
          <span className="text-3xl">/100</span>
        </p>
        <p className="stamp mt-3 max-w-full whitespace-normal bg-paper text-xl leading-tight">{result.title}</p>
        <p className="mt-3 font-marker text-xl leading-snug">{result.roast}</p>
        {result.bought > 0 && (
          <p className="mt-2 text-sm text-ink/70">
            {result.completionPct}% done · estimated dust on the untouched pages: {result.dustMm} mm
          </p>
        )}
      </div>
    </div>
  );
}

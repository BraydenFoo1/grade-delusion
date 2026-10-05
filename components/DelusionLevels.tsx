"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Reveal from "./ui/Reveal";
import { Eyebrow, Floating, Star } from "./ui/Doodles";
import { cn } from "@/lib/utils";

const levels = [
  {
    n: 1,
    name: "Optimistic",
    quote: "I read the chapter.",
    symptom: "Highlighted 80% of the page. Yellow is now a personality trait.",
    badge: "bg-mint",
    fill: "bg-mint",
    emoji: "🙂",
  },
  {
    n: 2,
    name: "Confident",
    quote: "I understand the chapter.",
    symptom: "Nods aggressively in class. Retains absolutely nothing.",
    badge: "bg-volt text-paper",
    fill: "bg-volt",
    emoji: "😎",
  },
  {
    n: 3,
    name: "Delusional",
    quote: "I don't need to revise.",
    symptom: "Describes the entire syllabus as “basically common sense.”",
    badge: "bg-sun",
    fill: "bg-sun",
    emoji: "🫠",
  },
  {
    n: 4,
    name: "Extremely Delusional",
    quote: "The exam will only test what I studied.",
    symptom: "Studied one topic. Confidently predicted the entire paper.",
    badge: "bg-hot",
    fill: "bg-hot",
    emoji: "🔮",
  },
  {
    n: 5,
    name: "Legendary",
    quote: "I didn't study but I can feel the A coming.",
    symptom: "Has already told the whole family the grade. Results come out next month.",
    badge: "stripes",
    fill: "stripes",
    emoji: "👑",
  },
];

export default function DelusionLevels() {
  const [active, setActive] = useState(3);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const level = levels[active - 1];
  const pct = active * 20;

  const select = (n: number, focus = false) => {
    setActive(n);
    if (focus) refs.current[n - 1]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const delta = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    select(((active - 1 + delta + 5) % 5) + 1, true);
  };

  return (
    <section id="levels" aria-labelledby="levels-title" className="relative overflow-hidden bg-ink py-24 text-paper sm:py-32">
      <Floating className="right-[5%] top-16 hidden md:block" dur={6}>
        <Star className="size-12 text-sun" />
      </Floating>
      <Floating className="bottom-20 left-[3%] hidden text-4xl lg:block" dur={7}>
        😭
      </Floating>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <Eyebrow n="02" className="text-sun">
            self-diagnosis
          </Eyebrow>
          <h2 id="levels-title" className="section-title max-w-4xl">
            What level of <span className="hl [--hl:var(--hot)]">delusional</span> are you?
          </h2>
          <p className="mt-5 max-w-xl text-lg text-paper/75">
            Pick your level. Be honest. <span className="font-hand text-2xl text-sun">(you won&apos;t be.)</span>
          </p>
        </Reveal>

        <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Level picker — swipeable chips on mobile, stacked list on desktop */}
          <div
            role="radiogroup"
            aria-label="Delusion levels"
            onKeyDown={onKeyDown}
            className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 lg:col-span-5 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
          >
            {levels.map((l) => {
              const on = l.n === active;
              return (
                <button
                  key={l.n}
                  ref={(el) => {
                    refs.current[l.n - 1] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => select(l.n)}
                  className={cn(
                    "flex min-w-[15.5rem] snap-start items-center gap-4 rounded-2xl border-[3px] p-4 text-left transition-all duration-300 lg:min-w-0",
                    on
                      ? "border-paper bg-paper text-ink shadow-[6px_6px_0_var(--sun)] lg:translate-x-3"
                      : "border-paper/25 hover:border-paper/70 hover:bg-paper/5",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-12 shrink-0 place-items-center rounded-full border-[3px] border-ink font-display text-xl text-ink",
                      l.badge,
                    )}
                    aria-hidden
                  >
                    <span className={cn(l.n === 5 && "rounded bg-paper px-1")}>{l.n}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.7rem] font-bold uppercase tracking-[0.2em] opacity-60">Level {l.n}</span>
                    <span className="block font-display text-xl uppercase leading-tight">{l.name}</span>
                    <span className="mt-2 flex gap-1" aria-hidden>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          className={cn(
                            "h-1.5 flex-1 rounded-full",
                            s <= l.n ? (on ? "bg-ink" : "bg-sun") : on ? "bg-ink/15" : "bg-paper/20",
                          )}
                        />
                      ))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Diagnosis card */}
          <div className="lg:col-span-7">
            <div
              key={level.n}
              aria-live="polite"
              className={cn(
                "relative rounded-[2rem] border-[3px] border-ink bg-paper p-6 text-ink shadow-[10px_10px_0_var(--hot)] sm:p-10",
                level.n === 5 && "shake-once",
              )}
            >
              {level.n === 5 && (
                <span className="stamp slam absolute -top-5 right-5 bg-sun text-base sm:text-lg">⚠ Max delusion</span>
              )}

              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="pop relative size-28 shrink-0 -rotate-6 sm:size-32">
                  <div className="burst-shape absolute inset-0 bg-ink" />
                  <div className={cn("burst-shape absolute inset-[5px] grid place-items-center", level.badge)}>
                    <span className="text-center leading-none">
                      <span className="block text-3xl" aria-hidden>
                        {level.emoji}
                      </span>
                      <span className="mt-1 block rounded bg-paper/90 px-1 font-display text-lg text-ink">LVL {level.n}</span>
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-ink/60">Official diagnosis</p>
                  <h3 className="font-display text-[clamp(2.4rem,6vw,4rem)] uppercase leading-[0.9]">{level.name}</h3>
                </div>
              </div>

              <div className="bubble pop mt-8 inline-block max-w-full [--d:150ms]">
                <p className="font-marker text-2xl leading-snug sm:text-3xl">“{level.quote}”</p>
              </div>

              <div className="mt-12">
                <div className="flex items-baseline justify-between text-xs font-bold uppercase tracking-[0.2em]">
                  <span id="meter-label">Delusion meter</span>
                  <span className="font-display text-2xl tracking-normal">{pct}%</span>
                </div>
                <div
                  role="meter"
                  aria-labelledby="meter-label"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  className="mt-2 h-7 overflow-hidden rounded-full border-[3px] border-ink bg-ink/5"
                >
                  <div
                    className={cn("meter-fill h-full rounded-full border-r-[3px] border-ink", level.fill)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between font-hand text-lg text-ink/60" aria-hidden>
                  <span>chill</span>
                  <span>concerning</span>
                  <span>send help</span>
                </div>
              </div>

              <p className="mt-6 text-lg leading-relaxed">
                <span className="mr-2 inline-block -rotate-2 rounded bg-sun px-2 py-0.5 text-xs font-bold uppercase tracking-widest">
                  Common symptom
                </span>
                {level.symptom}
              </p>

              <button
                type="button"
                onClick={() => select((active % 5) + 1)}
                className="brutal-btn mt-8 w-full justify-center bg-ink text-sun sm:w-auto"
              >
                {active === 5 ? "Return to reality (lvl 1)" : "Get more delusional"}
                <span aria-hidden>{active === 5 ? "↺" : "↑"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

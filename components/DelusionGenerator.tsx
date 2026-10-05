"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "./ui/Reveal";
import { Note, Warning } from "./eggs/Decor";
import { FoundOnMount, StarEgg } from "./eggs/Interactive";
import { BurstLayer, Eyebrow, Floating, Splash } from "./ui/Doodles";
import { useBurst, useClipboard } from "@/lib/hooks";
import { cn, pick } from "@/lib/utils";

const DELUSIONS = [
  "I only need to study the night before.",
  "The teacher definitely won't test this.",
  "I can finish the entire syllabus tonight.",
  "I'll remember this without writing it down.",
  "I definitely got at least 80%.",
  "The exam looked easier than expected.",
  "I'll start studying tomorrow.",
  "Five more minutes of TikTok, then I'll lock in.",
  "I understood the lesson, so I don't need to practise.",
  "If I sleep with the textbook under my pillow, it counts.",
  "Everyone else didn't study either. The bell curve will save me.",
  "Rewriting my notes in nice colours is basically studying.",
  "I don't need the formula sheet. I AM the formula sheet.",
  "I'll just revise during lunch before the exam.",
  "One 10-minute YouTube video = chapter mastered.",
  "My handwriting is so neat the examiner will give bonus marks.",
  "Making a study timetable is the hardest part. Done. Basically finished.",
  "I'll study on the bus. (I will be asleep on the bus.)",
];

const STEPS = ["Consulting the vibes…", "Ignoring the syllabus…", "Inflating confidence…", "Removing evidence…"];
const CONFETTI = ["⭐", "💀", "🧠", "✨", "😭", "🔥", "📚"];
const IDLE = "Press the button. Embrace the lie.";

type Phase = "idle" | "spinning" | "done";

function severity(rating: number) {
  if (rating >= 97) return "Legendary";
  if (rating >= 90) return "Extreme";
  return "Severe";
}

export default function DelusionGenerator() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState(IDLE);
  const [step, setStep] = useState(0);
  const [rating, setRating] = useState(0);
  const [count, setCount] = useState(0);
  const last = useRef(-1);
  const interval = useRef<number | undefined>(undefined);
  const timeout = useRef<number | undefined>(undefined);
  const { parts, fire } = useBurst();
  const { copied, copy } = useClipboard();

  useEffect(
    () => () => {
      window.clearInterval(interval.current);
      window.clearTimeout(timeout.current);
    },
    [],
  );

  const generate = () => {
    if (phase === "spinning") return;
    let next: number;
    do next = Math.floor(Math.random() * DELUSIONS.length);
    while (next === last.current);
    last.current = next;

    setPhase("spinning");
    let tick = 0;
    interval.current = window.setInterval(() => {
      tick++;
      setText(pick(DELUSIONS));
      setStep(Math.floor(tick / 5) % STEPS.length);
    }, 65);

    timeout.current = window.setTimeout(() => {
      window.clearInterval(interval.current);
      setText(DELUSIONS[next]);
      setRating(82 + Math.floor(Math.random() * 18));
      setPhase("done");
      setCount((c) => c + 1);
      fire(CONFETTI, 18, 230);
    }, 1300);
  };

  const spinning = phase === "spinning";

  return (
    <section
      id="generator"
      aria-labelledby="generator-title"
      className="relative overflow-hidden bg-hot py-24 sm:py-32"
    >
      <Splash className="pointer-events-none absolute -left-28 -top-20 w-60 text-sun sm:-left-24 sm:top-10 sm:w-96" />
      <Floating decorative={false} className="right-[8%] top-14 z-10" dur={5}>
        <StarEgg id="star" starClassName="size-12 text-sun" />
      </Floating>
      <Floating className="bottom-16 left-[45%] hidden text-4xl lg:block" dur={6} delay={1}>
        🔥
      </Floating>

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <Eyebrow n="04">mini-game</Eyebrow>
          <h2 id="generator-title" className="section-title">
            Generate your <span className="brush">delusion</span>
          </h2>
          <p className="mt-6 max-w-lg text-xl font-medium leading-relaxed">
            One button. Infinite confidence. Zero accountability. The patented* Delusion-O-Matic™ produces the exact
            lie you&apos;ll tell yourself before your next exam.
          </p>
          <p className="mt-2 font-hand text-xl">*not patented. we were going to do it tomorrow.</p>
          <p className="mt-8 inline-flex -rotate-2 items-center gap-3 rounded-xl border-[3px] border-ink bg-paper px-4 py-2 font-bold shadow-[4px_4px_0_var(--ink)]">
            <span className="font-display text-3xl tabular-nums">{count}</span>
            <span className="text-sm uppercase leading-tight tracking-wider">
              delusions generated
              <br />
              this session
            </span>
          </p>
          {/* Fixed height so the milestone message never shifts the layout */}
          <p className="mt-3 h-8 font-hand text-xl sm:text-2xl" aria-live="polite">
            {count >= 10 ? (
              <FoundOnMount id="generator-10">ok that&apos;s enough delusion for one day.</FoundOnMount>
            ) : (
              <Note>according to my calculations (I guessed).</Note>
            )}
          </p>
        </Reveal>

        <Reveal delay={150} className="relative">
          <p className="absolute -top-10 left-2 z-10 -rotate-6 font-hand text-2xl sm:-left-4" aria-hidden>
            warning: may cause confidence ↓
          </p>
          <div className="rotate-1 rounded-[2rem] border-[3px] border-ink bg-paper p-4 shadow-[10px_10px_0_var(--ink)] transition-transform duration-300 hover:rotate-0 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-1.5" aria-hidden>
                <span className="size-3.5 rounded-full border-2 border-ink bg-hot" />
                <span className="size-3.5 rounded-full border-2 border-ink bg-sun" />
                <span className="size-3.5 rounded-full border-2 border-ink bg-mint" />
              </div>
              <p className="font-display text-sm tracking-[0.18em] sm:text-base">DELUSION-O-MATIC 3000™</p>
              <span
                className={cn("size-3.5 rounded-full border-2 border-ink", spinning ? "animate-pulse-dot bg-hot" : "bg-mint")}
                aria-hidden
              />
            </div>

            <div
              aria-live="polite"
              aria-busy={spinning}
              className="scanlines relative mt-4 grid min-h-[15rem] place-items-center overflow-visible rounded-2xl border-[3px] border-ink bg-ink px-5 py-10 text-center sm:min-h-[16rem] sm:px-8"
            >
              <p
                key={phase === "done" ? text : phase}
                className={cn(
                  "font-marker text-[1.6rem] leading-snug text-sun sm:text-3xl",
                  spinning && "opacity-70 blur-[1.5px]",
                  phase === "done" && "pop",
                  phase === "idle" && "text-paper/80",
                )}
              >
                {phase === "idle" ? text : `“${text}”`}
              </p>
              {phase === "done" && (
                <span className="stamp slam absolute -bottom-5 right-4 bg-hot text-sm text-ink [--d:250ms] sm:text-base">
                  Delusion rating: {rating}%
                </span>
              )}
              <BurstLayer parts={parts} />
            </div>

            <p className="mt-6 h-5 text-center font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink/70">
              {spinning ? STEPS[step] : phase === "done" ? `Severity: ${severity(rating)}` : "Status: ready to lie to you"}
            </p>

            <button
              type="button"
              onClick={generate}
              disabled={spinning}
              className="brutal-btn wiggle-hover mt-4 w-full justify-center bg-sun py-5 text-lg sm:text-xl"
            >
              {spinning ? "Generating…" : "Give me a delusion"}
              <span aria-hidden>{spinning ? "🌀" : "🎰"}</span>
            </button>

            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                disabled={phase !== "done"}
                onClick={() => copy(`My delusion of the day: “${text}” — Grade Delusion™`)}
                className="whitespace-nowrap rounded-full border-2 border-ink px-4 py-2 font-bold uppercase tracking-wide transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
              >
                {copied ? "Copied ✓" : "Copy delusion"}
              </button>
              <span className="text-right font-hand text-lg leading-tight sm:text-xl">results not guaranteed 🙃</span>
            </div>
          </div>
          <Warning className="ml-auto mt-6 flex w-max text-ink">This statement has not been peer reviewed.</Warning>
        </Reveal>
      </div>
    </section>
  );
}

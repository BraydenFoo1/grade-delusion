"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "./ui/Reveal";
import { BurstLayer, Eyebrow, Floating, Sparkle } from "./ui/Doodles";
import { useBurst, useClipboard, useCountUp } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const QUESTIONS = [
  {
    q: "How early do you start studying?",
    options: ["Months before", "A few weeks before", "The night before", "During the exam"],
  },
  {
    q: "The exam just ended. What do you say?",
    options: ["“That was hard.”", "“Could've gone either way.”", "“I think I did pretty well.”", "“Full marks. Easily.”"],
  },
  {
    q: "Teacher says “this will be in the exam.” You…",
    options: ["Write it down twice", "Highlight it", "Nod confidently. Write nothing.", "“They say that every year.”"],
  },
  {
    q: "Your plan to finish the syllabus:",
    options: ["Spread it over weeks", "Revise on weekends", "One heroic all-nighter", "Absorb it through vibes"],
  },
  {
    q: "Your study playlist is…",
    options: ["Silence. Pure focus.", "Lo-fi beats", "Spent 2 hours making the perfect playlist", "Made the playlist. That counts as studying."],
  },
];

const LETTERS = ["A", "B", "C", "D"];
const MAX = QUESTIONS.length * 3;

const TIERS = [
  {
    min: 0,
    title: "Suspiciously Realistic",
    desc: "Are you… actually prepared? This is a delusion-free zone and frankly, we're concerned. Please report to Grade Solution immediately.",
  },
  {
    min: 35,
    title: "Mildly Delusional",
    desc: "You have a plan. You will follow roughly 40% of it. A perfectly healthy amount of hope.",
  },
  {
    min: 60,
    title: "Certified Delusional",
    desc: "Your confidence has completely outrun your revision, and it is not looking back.",
  },
  {
    min: 85,
    title: "Legendary Delusion",
    desc: "Congratulations. You are clinically confident in your academic abilities.",
  },
];

function toPercent(score: number) {
  return Math.round(12 + (score / MAX) * 87);
}

export default function DelusionTest() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const interacted = useRef(false);
  const { parts, fire } = useBurst();
  const { copied, copy } = useClipboard();

  const done = step >= QUESTIONS.length;
  const pct = toPercent(answers.reduce((a, b) => a + b, 0));
  const shown = useCountUp(pct, done);
  const tier = [...TIERS].reverse().find((t) => pct >= t.min)!;

  useEffect(() => {
    if (!interacted.current) return;
    headingRef.current?.focus({ preventScroll: true });
    if (done) {
      const t = window.setTimeout(() => fire(["🧠", "⭐", "💀", "✨", "🎓"], 22, 260), 1100);
      return () => window.clearTimeout(t);
    }
  }, [step, done, fire]);

  const choose = (i: number) => {
    if (selected !== null) return;
    interacted.current = true;
    setSelected(i);
    window.setTimeout(() => {
      setAnswers((a) => [...a.slice(0, step), i]);
      setStep((s) => s + 1);
      setSelected(null);
    }, 380);
  };

  const back = () => {
    if (step === 0 || selected !== null) return;
    setStep((s) => s - 1);
    setAnswers((a) => a.slice(0, step - 1));
  };

  const restart = () => {
    setAnswers([]);
    setStep(0);
  };

  const share = async () => {
    const text = `My delusion level is ${pct}% (${tier.title}). How delusional are you? — Grade Delusion™`;
    if (navigator.share) {
      try {
        await navigator.share({ text, url: window.location.href });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    copy(`${text} ${window.location.href}`);
  };

  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <section id="test" aria-labelledby="test-title" className="relative overflow-hidden bg-volt py-24 text-paper sm:py-32">
      <Floating className="left-[6%] top-24 hidden md:block" dur={6}>
        <Sparkle className="size-12 text-sun" />
      </Floating>
      <Floating className="bottom-24 right-[6%] hidden text-5xl md:block" dur={5} delay={1}>
        📚
      </Floating>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="text-center">
          <Eyebrow n="05" className="text-paper">
            the official test
          </Eyebrow>
          <h2 id="test-title" className="section-title mx-auto max-w-4xl">
            How <span className="hl [--hl:var(--hot)]">delusional</span> are you?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-paper/85">
            5 questions. 100% scientific*. <span className="font-hand text-2xl text-sun">*0% scientific.</span>
          </p>
        </Reveal>

        <Reveal delay={150} className="mx-auto mt-12 max-w-3xl">
          <div className="relative rounded-[2rem] border-[3px] border-ink bg-paper p-5 text-ink shadow-[10px_10px_0_var(--ink)] sm:p-10">
            {!done ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em]">
                    Question {step + 1} / {QUESTIONS.length}
                  </p>
                  <button
                    type="button"
                    onClick={back}
                    disabled={step === 0}
                    className="text-xs font-bold uppercase tracking-[0.2em] underline underline-offset-4 disabled:invisible"
                  >
                    ← Back
                  </button>
                </div>
                <div className="mt-3 flex gap-1.5" aria-hidden>
                  {QUESTIONS.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-2.5 flex-1 rounded-full border-2 border-ink transition-colors duration-300",
                        i < step ? "bg-hot" : i === step ? "bg-sun" : "bg-paper",
                      )}
                    />
                  ))}
                </div>

                <div key={step} className="pop">
                  <h3
                    ref={headingRef}
                    tabIndex={-1}
                    className="mt-8 font-display text-[clamp(1.9rem,5vw,3rem)] uppercase leading-[0.95] outline-none"
                  >
                    {QUESTIONS[step].q}
                  </h3>
                  <ul className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
                    {QUESTIONS[step].options.map((opt, i) => {
                      const isSel = selected === i;
                      const wasAnswer = answers[step] === i;
                      return (
                        <li key={opt}>
                          <button
                            type="button"
                            onClick={() => choose(i)}
                            className={cn(
                              "group flex h-full w-full items-center gap-4 rounded-2xl border-[3px] border-ink p-4 text-left text-base font-bold transition-all duration-150 sm:text-lg",
                              isSel
                                ? "translate-x-[3px] translate-y-[3px] bg-ink text-sun shadow-none"
                                : "bg-paper shadow-[4px_4px_0_var(--ink)] hover:-translate-y-0.5 hover:bg-sun hover:shadow-[6px_6px_0_var(--ink)]",
                              wasAnswer && !isSel && "bg-sun/50",
                            )}
                          >
                            <span
                              className={cn(
                                "grid size-10 shrink-0 place-items-center rounded-xl border-[3px] border-ink font-display text-lg transition-colors",
                                isSel ? "bg-sun text-ink" : "bg-paper group-hover:bg-paper",
                              )}
                            >
                              {LETTERS[i]}
                            </span>
                            <span>{opt}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <p className="mt-6 text-right font-hand text-xl text-ink/60" aria-hidden>
                  be honest. (or don&apos;t. very on-brand.)
                </p>
              </>
            ) : (
              <div className="relative text-center" aria-live="polite">
                <BurstLayer parts={parts} />
                <h3 ref={headingRef} tabIndex={-1} className="text-xs font-bold uppercase tracking-[0.25em] outline-none">
                  Your delusion level:
                </h3>

                <div className="relative mx-auto mt-6 size-52 sm:size-60">
                  <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden>
                    <circle cx="64" cy="64" r={R} fill="none" stroke="var(--ink)" strokeOpacity="0.08" strokeWidth="14" />
                    <circle
                      cx="64"
                      cy="64"
                      r={R}
                      fill="none"
                      stroke="var(--hot)"
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeDasharray={C}
                      strokeDashoffset={C * (1 - shown / 100)}
                    />
                  </svg>
                  <p className="absolute inset-0 grid place-items-center font-display text-7xl tabular-nums sm:text-8xl">
                    <span>
                      {shown}
                      <span className="text-4xl">%</span>
                    </span>
                  </p>
                  <span className="sr-only">{pct} percent</span>
                </div>

                <p className="stamp slam mt-6 bg-sun text-2xl [--d:1000ms] sm:text-3xl">{tier.title}</p>
                <p className="mx-auto mt-6 max-w-md font-marker text-xl leading-snug sm:text-2xl">{tier.desc}</p>
                <p className="mt-3 text-sm text-ink/70">
                  *Not a real diagnosis. Not medical advice. Purely a vibe check.
                </p>

                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <button type="button" onClick={share} className="brutal-btn justify-center bg-hot">
                    {copied ? "Copied ✓" : "Share my result"} <span aria-hidden>↗</span>
                  </button>
                  <button type="button" onClick={restart} className="brutal-btn justify-center bg-paper">
                    Retake test <span aria-hidden>↺</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

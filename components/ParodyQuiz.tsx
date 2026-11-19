"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Reveal from "./ui/Reveal";
import StoryCard from "./quiz/StoryCard";
import { BurstLayer, Eyebrow } from "./ui/Doodles";
import { useBurst, useCountUp } from "@/lib/hooks";
import { DISCLAIMER, EDITION_LABEL, QUESTIONS, QUIZ_TITLE, resultFor } from "@/lib/parody-quiz";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"];

/**
 * "Student Edition": the comedy companion to Grade Solution's Parent Edition diagnostic quiz.
 * Independent of DelusionTest. Answers and results live in component state only: nothing is stored or sent.
 */
export default function ParodyQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const interacted = useRef(false);
  const choosing = useRef<number | undefined>(undefined);
  const { parts, fire } = useBurst();

  const done = step >= QUESTIONS.length;
  const result = useMemo(() => (done ? resultFor(answers) : null), [done, answers]);
  const shown = useCountUp(result?.pct ?? 0, done);

  useEffect(() => () => window.clearTimeout(choosing.current), []);

  useEffect(() => {
    if (!interacted.current) return;
    headingRef.current?.focus({ preventScroll: true });
    if (done) {
      const t = window.setTimeout(() => fire(["🎓", "📚", "💀", "✨", "🤡"], 22, 260), 900);
      return () => window.clearTimeout(t);
    }
  }, [step, done, fire]);

  const choose = (i: number) => {
    if (selected !== null) return;
    interacted.current = true;
    setSelected(i);
    choosing.current = window.setTimeout(() => {
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

  const q = QUESTIONS[Math.min(step, QUESTIONS.length - 1)];

  return (
    <section id="student-quiz" aria-labelledby="student-quiz-title" className="relative overflow-hidden bg-sun py-24 text-ink sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="text-center">
          <Eyebrow n="5a" className="text-ink">
            the twin quiz
          </Eyebrow>
          <p className="stamp mx-auto mb-4 w-fit bg-ink text-xl text-sun">{EDITION_LABEL}</p>
          <h2 id="student-quiz-title" className="section-title mx-auto max-w-4xl">
            {QUIZ_TITLE}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink/85">
            The student companion to Grade Solution’s Parent Edition diagnostic quiz. 7 questions. {DISCLAIMER}
          </p>
        </Reveal>

        <Reveal delay={150} className="mx-auto mt-12 max-w-3xl">
          <div className="rounded-[2rem] border-[3px] border-ink bg-paper p-5 text-ink shadow-[10px_10px_0_var(--ink)] sm:p-10">
            {!done ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em]">
                    {EDITION_LABEL} · Question {step + 1} / {QUESTIONS.length}
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
                    className="mt-8 font-display text-[clamp(1.8rem,5vw,2.8rem)] uppercase leading-[0.98] outline-none"
                  >
                    {q.q}
                  </h3>
                  <ul className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
                    {q.options.map((opt, i) => {
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
                                isSel ? "bg-sun text-ink" : "bg-paper",
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
                <p className="mt-6 text-right text-sm text-ink/60">{DISCLAIMER}</p>
              </>
            ) : (
              result && (
                <div className="relative text-center" aria-live="polite">
                  <BurstLayer parts={parts} />
                  <h3 ref={headingRef} tabIndex={-1} className="text-xs font-bold uppercase tracking-[0.25em] outline-none">
                    {EDITION_LABEL} · your Delusion Level
                  </h3>
                  {/* The count-up is decorative: hidden from assistive technology so the live region doesn't announce every step. The sr-only text below is the accessible result. */}
                  <p aria-hidden="true" className="mt-3 font-display text-8xl tabular-nums text-hot sm:text-9xl">
                    {shown}
                    <span className="text-5xl">%</span>
                  </p>
                  <span className="sr-only">{result.pct} percent</span>
                  <p className="stamp slam mt-4 max-w-full whitespace-normal bg-sun px-4 py-2 text-2xl leading-tight [--d:900ms] sm:text-3xl">{result.rank}</p>
                  <p className="mx-auto mt-6 max-w-md font-marker text-xl leading-snug sm:text-2xl">{result.diagnosis}</p>
                  <p className="mt-3 text-sm text-ink/70">{DISCLAIMER}</p>

                  <StoryCard data={{ pct: result.pct, rank: result.rank, diagnosis: result.diagnosis }} />

                  <a
                    href={site.gradeSolutionQuizUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="brutal-btn mx-auto mt-10 w-full max-w-lg justify-center bg-volt text-center text-paper"
                  >
                    Think you’re actually safe? Challenge your parents with the real diagnostic quiz <span aria-hidden>→</span>
                  </a>

                  <button type="button" onClick={restart} className="brutal-btn mt-4 justify-center bg-paper">
                    Retake quiz <span aria-hidden>↺</span>
                  </button>
                </div>
              )
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

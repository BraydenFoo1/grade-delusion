"use client";

import { useEffect, useState } from "react";
import Reveal from "./ui/Reveal";
import { handleTabKeys } from "./toys/shared";
import { Eyebrow } from "./ui/Doodles";
import { countdownState, UNANNOUNCED_HEADLINE } from "@/lib/countdown";
import { EXAM_YEAR, EXAMS_2027, type ExamConfig } from "@/lib/exam-dates";
import { cn } from "@/lib/utils";

const UNITS = ["Days", "Hours", "Minutes", "Seconds"] as const;
const pad = (n: number) => String(n).padStart(2, "0");

/** Current time, ticking once a second. Null on the server and until mounted, so no time is ever server-rendered. */
function useNow(active: boolean): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    let id: number | undefined;
    const start = () => {
      window.clearInterval(id);
      id = window.setInterval(() => setNow(Date.now()), 1000);
    };
    const onVisibility = () => {
      if (document.hidden) window.clearInterval(id);
      else {
        setNow(Date.now());
        start();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active]);
  return now;
}

function formatTarget(d: Date) {
  return new Intl.DateTimeFormat("en-SG", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Singapore" }).format(d);
}

/**
 * Exam panic countdown. Counts down only for exams whose date is VERIFIED in lib/exam-dates.ts; otherwise it shows
 * "2027 Exam Dates Not Announced Yet". `exams` is a prop only so tests can inject a fixture; production uses the config.
 */
export default function ExamCountdown({ exams = EXAMS_2027 }: { exams?: readonly ExamConfig[] }) {
  const [index, setIndex] = useState(0);
  const exam = exams[index] ?? exams[0];
  const anyVerified = exams.some((e) => e.official !== null);
  const now = useNow(anyVerified);
  const state = countdownState(exam, now ?? 0);
  // Before mount a verified exam has no clock yet: show the neutral placeholder rather than a wrong number.
  const ready = state.kind === "unannounced" || now !== null;

  return (
    <section id="countdown" aria-labelledby="countdown-title" className="relative overflow-hidden bg-ink py-24 text-paper sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal className="text-center">
          <Eyebrow n="5b" className="text-paper">
            panic o’clock
          </Eyebrow>
          <h2 id="countdown-title" className="section-title mx-auto max-w-4xl">
            Exam <span className="hl [--hl:var(--hot)]">panic</span> countdown
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-paper/85">
            {EXAM_YEAR} edition. We only count down to dates the exam boards have officially announced.
          </p>
        </Reveal>

        <Reveal delay={150} className="mx-auto mt-12 max-w-3xl">
          <div className="rounded-[2rem] border-[3px] border-paper bg-paper p-4 text-ink shadow-[10px_10px_0_var(--hot)] sm:p-8">
            <div role="tablist" aria-label="Choose an exam" className="grid grid-cols-3 gap-2 sm:gap-3">
              {exams.map((e, i) => (
                <button
                  key={e.id}
                  id={`cd-tab-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-controls="cd-panel"
                  tabIndex={i === index ? 0 : -1}
                  onClick={() => setIndex(i)}
                  onKeyDown={(ev) => handleTabKeys(ev, i, exams.length, setIndex, "cd")}
                  className={cn(
                    "rounded-xl border-[3px] border-ink px-2 py-3 font-display text-xl uppercase transition-all sm:text-2xl",
                    i === index ? "bg-sun shadow-none" : "bg-paper shadow-[3px_3px_0_var(--ink)] hover:bg-sun/60",
                  )}
                >
                  {e.label}
                </button>
              ))}
            </div>

            <div id="cd-panel" role="tabpanel" aria-labelledby={`cd-tab-${index}`} className="mt-6 text-center">
              <p className="text-sm font-bold text-ink/70">{exam.subtitle}</p>

              {state.kind === "unannounced" ? (
                <>
                  <p className="mt-4 font-display text-[clamp(1.8rem,6vw,3rem)] uppercase leading-none">{UNANNOUNCED_HEADLINE}</p>
                  <p className="mt-2 text-sm text-ink/70">We’ll switch the clock on once SEAB or MOE publishes an official date.</p>
                </>
              ) : state.kind === "over" ? (
                <p className="mt-4 font-display text-[clamp(1.8rem,6vw,3rem)] uppercase leading-none">Time’s up</p>
              ) : null}

              <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-4" aria-hidden>
                {UNITS.map((u, i) => {
                  const value =
                    state.kind === "live" && ready
                      ? pad([state.time.days, state.time.hours, state.time.minutes, state.time.seconds][i])
                      : state.kind === "over"
                        ? "00"
                        : "– –";
                  return (
                    <div
                      key={u}
                      className={cn(
                        "rounded-xl border-[3px] border-ink py-3",
                        state.kind === "live" && ready ? "bg-ink text-sun" : "border-dashed bg-paper text-ink/70",
                      )}
                    >
                      <p className="font-display text-4xl tabular-nums sm:text-6xl">{value}</p>
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] sm:text-xs">{u}</p>
                    </div>
                  );
                })}
              </div>

              {state.kind === "live" && ready && (
                <>
                  <p className="sr-only">
                    {state.time.days} days to go until {state.describes.toLowerCase()}.
                  </p>
                  <p className="mt-3 text-sm text-ink/70">
                    {state.describes}: {formatTarget(state.target)} (Singapore time).{" "}
                    <a
                      href={exam.official?.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold underline underline-offset-4"
                    >
                      Official source
                    </a>
                    , checked {exam.official?.verifiedOn}.
                  </p>
                </>
              )}

              <div className="mt-6 rounded-2xl border-[3px] border-ink bg-sun p-4" role="status" aria-live="polite">
                <p className="text-xs font-bold uppercase tracking-[0.2em]">Current Delusion Status</p>
                <p className="mt-1 font-marker text-xl leading-snug sm:text-2xl">{state.status}</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

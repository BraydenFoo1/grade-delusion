"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "./ui/Reveal";
import { Note, Warning } from "./eggs/Decor";
import { FoundOnMount, StarEgg } from "./eggs/Interactive";
import { BurstLayer, Eyebrow, Floating, Splash } from "./ui/Doodles";
import { useBurst, useClipboard } from "@/lib/hooks";
import {
  DEFAULT_SCENARIO,
  SCENARIOS,
  createLineBag,
  rollConfidence,
  scenarioById,
  severity,
  type ScenarioId,
} from "@/lib/delusions";
import { homeUrl } from "@/lib/site";
import { cn, pick } from "@/lib/utils";

const STEPS = ["Consulting the vibes…", "Ignoring the syllabus…", "Inflating confidence…", "Removing evidence…"];
const CONFETTI = ["⭐", "💀", "🧠", "✨", "😭", "🔥", "📚"];
const IDLE = "Pick your situation. Press the button. Embrace the lie.";
const SHARE_URL = `${homeUrl}#generator`;

type Phase = "idle" | "spinning" | "done";

/** One generated result. Confidence is rolled once when the result is created, so it never changes on re-render. */
type Result = { text: string; scenarioId: ScenarioId; confidence: number };

/** Skip the slot-machine reel for reduced-motion users and when the site's "Pause animations" button is on. */
function shouldSkipReel() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.motion === "paused"
  );
}

export default function DelusionGenerator() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>(DEFAULT_SCENARIO);
  const [phase, setPhase] = useState<Phase>("idle");
  const [reelText, setReelText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(0);
  const bags = useRef(new Map<ScenarioId, () => string>());
  const interval = useRef<number | undefined>(undefined);
  const timeout = useRef<number | undefined>(undefined);
  const { parts, fire } = useBurst();
  const { copied, copy } = useClipboard();
  const shareFallback = useClipboard();

  useEffect(
    () => () => {
      window.clearInterval(interval.current);
      window.clearTimeout(timeout.current);
    },
    [],
  );

  // Each scenario keeps its own no-repeat queue for the whole visit.
  const draw = (id: ScenarioId) => {
    let bag = bags.current.get(id);
    if (!bag) {
      bag = createLineBag(scenarioById(id).lines);
      bags.current.set(id, bag);
    }
    return bag();
  };

  const finish = (next: Result) => {
    setResult(next);
    setPhase("done");
    setCount((c) => c + 1);
    fire(CONFETTI, 18, 230);
  };

  const generate = () => {
    if (phase === "spinning") return;
    const next: Result = { text: draw(scenarioId), scenarioId, confidence: rollConfidence() };
    if (shouldSkipReel()) {
      finish(next);
      return;
    }

    const pool = scenarioById(scenarioId).lines;
    setPhase("spinning");
    setStep(0);
    setReelText(pick(pool));
    let tick = 0;
    interval.current = window.setInterval(() => {
      tick++;
      setReelText(pick(pool));
      setStep(Math.floor(tick / 5) % STEPS.length);
    }, 65);

    timeout.current = window.setTimeout(() => {
      window.clearInterval(interval.current);
      finish(next);
    }, 1300);
  };

  const spinning = phase === "spinning";
  const ready = phase === "done" && result !== null;
  const resultScenario = result ? scenarioById(result.scenarioId) : null;
  const shareText = result
    ? `My delusion of the day: “${result.text}” Confidence: ${result.confidence}%. Evidence: 0%. — Grade Delusion™`
    : "";

  // Native share sheet where supported; otherwise (or if sharing fails) copy the text and link.
  const share = async () => {
    if (!result) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Grade Delusion", text: shareText, url: SHARE_URL });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // user closed the share sheet
      }
    }
    await shareFallback.copy(`${shareText} ${SHARE_URL}`);
  };

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

            <fieldset disabled={spinning} className={cn("mt-4 transition-opacity", spinning && "opacity-60")}>
              <legend className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink/70">
                Pick your situation
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {SCENARIOS.map((s) => (
                  <label
                    key={s.id}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-ink bg-paper px-3 py-1.5 text-sm font-bold transition-colors hover:bg-sun/50",
                      "has-[:checked]:bg-ink has-[:checked]:text-sun",
                      "has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-volt has-[:focus-visible]:outline-solid",
                    )}
                  >
                    <input
                      type="radio"
                      name="delusion-scenario"
                      value={s.id}
                      checked={scenarioId === s.id}
                      onChange={() => setScenarioId(s.id)}
                      className="sr-only"
                    />
                    <span aria-hidden>{s.emoji}</span>
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="scanlines relative mt-4 grid min-h-[15rem] place-items-center overflow-visible rounded-2xl border-[3px] border-ink bg-ink px-5 py-10 text-center sm:min-h-[16rem] sm:px-8">
              {ready && resultScenario && (
                <span className="absolute left-3 top-3 rounded-full border-2 border-paper/40 px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wider text-paper/85">
                  <span aria-hidden>{resultScenario.emoji}</span> {resultScenario.label}
                </span>
              )}
              <p
                key={phase === "done" ? `result-${count}` : phase}
                className={cn(
                  "font-marker text-[1.6rem] leading-snug text-sun sm:text-3xl",
                  spinning && "opacity-70 blur-[1.5px]",
                  phase === "done" && "pop",
                  phase === "idle" && "text-paper/80",
                )}
              >
                {spinning ? `“${reelText}”` : ready ? `“${result.text}”` : IDLE}
              </p>
              {ready && (
                <span className="stamp slam absolute -bottom-5 right-4 bg-hot text-sm text-ink [--d:250ms] sm:text-base">
                  Confidence: {result.confidence}%
                </span>
              )}
              <BurstLayer parts={parts} />
            </div>

            {/* Announces only the final result, never the flickering reel. */}
            <p className="sr-only" aria-live="polite">
              {ready
                ? `Your delusion: ${result.text} Confidence ${result.confidence} percent. Evidence 0 percent.`
                : ""}
            </p>

            <p className="mt-6 h-5 text-center font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink/70">
              {spinning
                ? STEPS[step]
                : ready
                  ? `Evidence: 0% · Severity: ${severity(result.confidence)}`
                  : "Status: ready to lie to you"}
            </p>

            <button
              type="button"
              onClick={generate}
              disabled={spinning}
              className="brutal-btn wiggle-hover mt-4 w-full justify-center bg-sun py-5 text-lg sm:text-xl"
            >
              {spinning ? "Generating…" : result ? "Give me another delusion" : "Give me a delusion"}
              <span aria-hidden>{spinning ? "🌀" : "🎰"}</span>
            </button>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                disabled={!ready}
                onClick={() => copy(shareText)}
                className="whitespace-nowrap rounded-full border-2 border-ink px-4 py-2 font-bold uppercase tracking-wide transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
              >
                {copied ? "Copied ✓" : "Copy delusion"}
              </button>
              <button
                type="button"
                disabled={!ready}
                onClick={share}
                className="whitespace-nowrap rounded-full border-2 border-ink px-4 py-2 font-bold uppercase tracking-wide transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
              >
                {shareFallback.copied ? "Link copied ✓" : "Share"} <span aria-hidden>↗</span>
              </button>
              <span className="ml-auto text-right font-hand text-lg leading-tight sm:text-xl">results not guaranteed 🙃</span>
            </div>
          </div>
          <Warning className="ml-auto mt-6 flex w-max text-ink">This statement has not been peer reviewed.</Warning>
        </Reveal>
      </div>
    </section>
  );
}

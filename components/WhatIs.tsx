"use client";

import { useState } from "react";
import Reveal from "./ui/Reveal";
import { Arrow, Eyebrow, Sparkle } from "./ui/Doodles";
import { cn } from "@/lib/utils";

const cards = [
  {
    emoji: "🧠",
    label: "Confidence",
    quote: "I definitely know this.",
    status: "Status: certain",
    reality: "Confidence level: 100%. Evidence level: 0%. Vibes: immaculate.",
    face: "bg-sun",
    tilt: "md:-rotate-2",
  },
  {
    emoji: "📚",
    label: "Preparation",
    quote: "I'll study tonight.",
    status: "Status: planning",
    reality: "Tonight became tomorrow. Tomorrow became the exam. The exam is now.",
    face: "bg-mint",
    tilt: "md:rotate-1 md:translate-y-6",
  },
  {
    emoji: "💀",
    label: "Reality",
    quote: "Why was Question 1 already difficult?",
    status: "Status: suffering",
    reality: "Question 1 was the warm-up. You were not warm. You were frozen solid.",
    face: "bg-hot",
    tilt: "md:-rotate-1",
  },
];

function FlipCard({ card }: { card: (typeof cards)[number] }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      aria-label={`${card.label}: “${card.quote}” — ${flipped ? card.reality : "tap for a reality check"}`}
      data-flipped={flipped}
      className={cn(
        "flip group block h-[21rem] w-full text-left transition-transform duration-300 hover:rotate-0 hover:scale-[1.02] sm:h-[22rem]",
        card.tilt,
      )}
    >
      <span className="flip-inner block">
        {/* Front */}
        <span
          className={cn(
            "flip-face flex flex-col justify-between rounded-[1.75rem] border-[3px] border-ink p-7 shadow-[8px_8px_0_var(--ink)]",
            card.face,
          )}
        >
          <span className="flex items-start justify-between gap-3">
            <span className="inline-block text-6xl group-hover:animate-wiggle" aria-hidden>
              {card.emoji}
            </span>
            <span className="rounded-full border-2 border-ink bg-paper px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider">
              {card.status}
            </span>
          </span>
          <span>
            <span className="block font-display text-4xl uppercase sm:text-5xl">{card.label}</span>
            <span className="mt-2 block font-marker text-2xl leading-snug">“{card.quote}”</span>
          </span>
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <span className="inline-block transition-transform duration-500 group-hover:rotate-180" aria-hidden>
              ↻
            </span>
            Tap for reality check
          </span>
        </span>

        {/* Back */}
        <span className="flip-face flip-back flex flex-col justify-between rounded-[1.75rem] border-[3px] border-ink bg-ink p-7 text-paper shadow-[8px_8px_0_var(--hot)]">
          <span className="font-display text-sm tracking-[0.25em] text-sun">REALITY CHECK — {card.label.toUpperCase()}</span>
          <span className="font-marker text-2xl leading-snug sm:text-[1.65rem]">{card.reality}</span>
          <span className="stamp self-start bg-hot text-lg text-ink">Delusion detected</span>
        </span>
      </span>
    </button>
  );
}

export default function WhatIs() {
  return (
    <section id="what" aria-labelledby="what-title" className="relative overflow-hidden bg-paper py-24 sm:py-32">
      <Sparkle className="pointer-events-none absolute right-[6%] top-20 size-12 text-sun" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <Eyebrow n="01">the lore</Eyebrow>
          <h2 id="what-title" className="section-title max-w-5xl">
            So... what <span className="hl">exactly</span> is Grade Delusion?
          </h2>
        </Reveal>

        <div className="mt-12 grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-7">
            <p className="text-2xl font-medium leading-snug sm:text-3xl">
              Grade Delusion is the place for every student who has ever walked out of an exam saying,{" "}
              <span className="font-marker text-hot">“I think I did pretty well.”</span>
            </p>
          </Reveal>
          <Reveal delay={150} className="lg:col-span-5">
            <div className="note tape rotate-2 rounded-sm bg-sun p-7 transition-transform duration-300 hover:rotate-0">
              <p className="text-lg font-medium leading-relaxed">
                We&apos;re here to celebrate the <b>confidence</b>, <b>chaos</b>, <b>optimism</b> and{" "}
                <b>questionable logic</b> that comes with being a student.
              </p>
              <p className="mt-4 font-hand text-2xl">— the management (also delusional)</p>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-16 flex items-end gap-2 sm:mt-20">
          <p className="-rotate-2 font-hand text-2xl sm:text-3xl">tap a card. face reality.</p>
          <Arrow className="h-12 w-20 rotate-[35deg]" />
        </Reveal>

        <ul className="mt-6 grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-10">
          {cards.map((c, i) => (
            <li key={c.label}>
              <Reveal delay={i * 120}>
                <FlipCard card={c} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

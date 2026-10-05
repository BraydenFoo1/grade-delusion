"use client";

import { useState, type ReactNode } from "react";
import Reveal from "./ui/Reveal";
import { MiniStamp, Note } from "./eggs/Decor";
import { FoundOnMount } from "./eggs/Interactive";
import { BurstLayer, Eyebrow, MarkerCircle } from "./ui/Doodles";
import { useBurst, useClipboard } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

type Tag = "exams" | "studying" | "results" | "life";

type Meme = {
  id: string;
  tag: Tag;
  avatar: string;
  avatarBg: string;
  share: string;
  caption: ReactNode;
  visual: ReactNode;
};

const reactions = [
  { key: "relate", emoji: "😂", label: "I relate" },
  { key: "real", emoji: "💀", label: "Too real" },
  { key: "delusional", emoji: "🧠", label: "Delusional" },
] as const;

const memes: Meme[] = [
  {
    id: "skipped-page",
    tag: "exams",
    avatar: "📄",
    avatarBg: "bg-volt",
    share: "When you studied for 6 hours and the exam asks about the ONE page you skipped.",
    caption: (
      <p>
        When you studied for <b>6 hours</b> and the exam asks about the <b>ONE page</b> you skipped.
      </p>
    ),
    visual: (
      <div className="relative bg-volt px-5 pb-14 pt-7 sm:px-8">
        <div className="relative mx-auto max-w-sm -rotate-2 border-[3px] border-ink bg-paper p-5 shadow-[6px_6px_0_var(--ink)]">
          <p className="font-display text-sm tracking-[0.2em]">FINAL EXAM — PAPER 1</p>
          <div className="mt-3 space-y-2" aria-hidden>
            <div className="h-2 w-full rounded bg-ink/10" />
            <div className="h-2 w-4/5 rounded bg-ink/10" />
          </div>
          <p className="mt-4 font-bold leading-relaxed">
            Q1. Explain everything on{" "}
            <span className="relative inline-block px-1">
              page 47
              <MarkerCircle className="draw-now absolute -left-2 -top-1.5 h-[calc(100%+0.75rem)] w-[calc(100%+1rem)] text-hot" />
            </span>
            . <span className="text-ink/70">(100 marks)</span>
          </p>
        </div>
        <p className="absolute bottom-3 right-5 rotate-[-4deg] font-hand text-2xl text-paper sm:right-10">
          ↑ the ONE page I skipped 💀
        </p>
      </div>
    ),
  },
  {
    id: "teacher-important",
    tag: "studying",
    avatar: "🍎",
    avatarBg: "bg-hot",
    share: "Teacher: This topic is very important. Me: *I'll remember it.* Also me 10 minutes later:",
    caption: (
      <div className="space-y-1">
        <p>
          <b>Teacher:</b> This topic is very important.
        </p>
        <p>
          <b>Me:</b> <i>*I&apos;ll remember it.*</i>
        </p>
        <p>
          <b>Also me 10 minutes later:</b>
        </p>
      </div>
    ),
    visual: (
      <div className="bg-sun px-6 py-8 text-center">
        <div className="inline-block text-7xl hover:animate-wiggle" aria-hidden>
          🫠
        </div>
        <p className="mt-3 font-mono text-xs font-bold uppercase tracking-[0.2em] sm:text-sm">
          [ memory.exe has stopped responding ]
        </p>
        <div className="mx-auto mt-4 h-3.5 max-w-xs overflow-hidden rounded-full border-2 border-ink bg-paper">
          <div className="h-full w-[3%] bg-hot" />
        </div>
        <p className="mt-2 font-hand text-2xl">topic retention: 3%</p>
      </div>
    ),
  },
  {
    id: "who-is-this-for",
    tag: "exams",
    avatar: "😎",
    avatarBg: "bg-mint",
    share: "Me before the exam: 'I got this.' Me after Question 1: 'Who is this paper for?'",
    caption: <p>Me before the exam vs. me after Question 1:</p>,
    visual: (
      <div className="grid grid-cols-2 divide-x-[3px] divide-ink">
        <div className="bg-mint p-4 sm:p-6">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] sm:text-xs">Before the exam</p>
          <p className="mt-3 text-5xl sm:text-6xl" aria-hidden>
            😎
          </p>
          <p className="mt-3 font-marker text-lg leading-tight sm:text-2xl">“I got this.”</p>
        </div>
        <div className="bg-hot p-4 sm:p-6">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] sm:text-xs">After Question 1</p>
          <p className="mt-3 text-5xl sm:text-6xl" aria-hidden>
            😭
          </p>
          <p className="mt-3 font-marker text-lg leading-tight sm:text-2xl">“Who is this paper for?”</p>
        </div>
      </div>
    ),
  },
  {
    id: "expected-grade",
    tag: "results",
    avatar: "🧮",
    avatarBg: "bg-sun",
    share: "POV: You calculated your expected grade before the results came out.",
    caption: (
      <p>
        <b>POV:</b> You calculated your expected grade before the results came out.
      </p>
    ),
    visual: (
      <div className="relative bg-ink p-5 pb-20 font-mono text-sm text-paper sm:p-7 sm:pb-20 sm:text-base">
        <dl className="space-y-2">
          {[
            ["Paper 1 (vibes)", "92"],
            ["Paper 2 (felt okay?)", "88"],
            ["Practical (I tried)", "95"],
            ["Bonus for neat handwriting", "+10"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-paper/70">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between border-t-2 border-dashed border-paper/30 pt-3">
            <dt className="font-bold uppercase tracking-widest">Expected</dt>
            <dd className="font-display text-4xl text-sun">A+</dd>
          </div>
        </dl>
        <span className="stamp absolute bottom-5 right-4 bg-hot text-base text-ink">Actual: loading… 💀</span>
      </div>
    ),
  },
  {
    id: "3am-brain",
    tag: "studying",
    avatar: "🌙",
    avatarBg: "bg-volt",
    share: "My brain at 3am vs. my brain during the exam.",
    caption: <p>My brain at 3am vs. my brain during the exam:</p>,
    visual: (
      <div className="dots grid gap-8 bg-paper p-5 pb-9 sm:grid-cols-2 sm:gap-5 sm:p-6 sm:pb-10">
        <div className="bubble -rotate-1">
          <p className="text-xs font-bold uppercase tracking-widest text-ink/60">🌙 3:00 AM</p>
          <p className="mt-1 font-bold">Remember that embarrassing thing you said in Primary 4?</p>
        </div>
        <div className="bubble rotate-1">
          <p className="text-xs font-bold uppercase tracking-widest text-ink/60">📝 During exam</p>
          <p className="mt-1 font-bold">Formula? Never met her.</p>
        </div>
      </div>
    ),
  },
  {
    id: "group-project",
    tag: "life",
    avatar: "👥",
    avatarBg: "bg-mint",
    share: "Group project: 4 members. 1 doing the work. 3 providing 'emotional support'.",
    caption: (
      <p>
        Group project: 4 members. 1 doing the work. 3 providing <i>“emotional support.”</i>
      </p>
    ),
    visual: (
      <div className="grid grid-cols-4 gap-2 bg-volt p-4 text-center sm:gap-3 sm:p-6">
        {[
          ["🧑‍💻", "doing literally everything", "bg-sun"],
          ["🫡", "moral support", "bg-paper"],
          ["😴", "moral support (asleep)", "bg-paper"],
          ["👻", "last seen: march", "bg-paper"],
        ].map(([e, l, bg]) => (
          <div key={l} className={cn("rounded-xl border-2 border-ink p-2 sm:p-3", bg)}>
            <p className="text-3xl sm:text-4xl" aria-hidden>
              {e}
            </p>
            <p className="mt-1 text-[0.6rem] font-bold uppercase leading-tight sm:text-[0.7rem]">{l}</p>
          </div>
        ))}
      </div>
    ),
  },
];

const filters: { key: "all" | Tag; label: string }[] = [
  { key: "all", label: "For you" },
  { key: "exams", label: "#exams" },
  { key: "studying", label: "#studying" },
  { key: "results", label: "#results" },
  { key: "life", label: "#studentlife" },
];

function ReactionButton({
  emoji,
  label,
  active,
  onToggle,
}: {
  emoji: string;
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  const { parts, fire } = useBurst();
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => {
        if (!active) fire([emoji], 7, 70);
        onToggle();
      }}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all duration-150 active:scale-90 sm:text-sm",
        active ? "bg-sun shadow-[3px_3px_0_var(--ink)] -translate-y-0.5" : "bg-paper hover:bg-sun/40",
      )}
    >
      <BurstLayer parts={parts} />
      <span aria-hidden className={cn("inline-block transition-transform", active && "scale-125")}>
        {emoji}
      </span>
      {label}
    </button>
  );
}

function MemeCard({ meme, tilt }: { meme: Meme; tilt: string }) {
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const { copied, copy } = useClipboard();

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[1.75rem] border-[3px] border-ink bg-paper shadow-[8px_8px_0_var(--ink)] transition-transform duration-300 hover:rotate-0 hover:scale-[1.015]",
        tilt,
      )}
    >
      <header className="flex items-center gap-3 p-5">
        <span
          className={cn("grid size-11 shrink-0 place-items-center rounded-full border-2 border-ink text-xl", meme.avatarBg)}
          aria-hidden
        >
          {meme.avatar}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-bold">Grade Delusion</p>
          <p className="text-sm text-ink/70">{site.handle}</p>
        </div>
        <span className="rounded-full bg-ink px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-paper">
          #{meme.tag}
        </span>
      </header>

      <div className="px-5 text-lg font-medium leading-snug">{meme.caption}</div>

      <div className="mx-5 mt-4 overflow-hidden rounded-2xl border-[3px] border-ink">{meme.visual}</div>

      <footer className="flex flex-wrap items-center gap-2 p-5">
        {reactions.map((r) => (
          <ReactionButton
            key={r.key}
            emoji={r.emoji}
            label={r.label}
            active={!!picked[r.key]}
            onToggle={() => setPicked((p) => ({ ...p, [r.key]: !p[r.key] }))}
          />
        ))}
        <button
          type="button"
          onClick={() => copy(`“${meme.share}” — via Grade Delusion™ ${site.handle}`)}
          className="ml-auto rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wide underline decoration-2 underline-offset-4 hover:bg-ink hover:text-paper sm:text-sm"
        >
          <span aria-live="polite">{copied ? "Copied ✓" : "Share ↗"}</span>
        </button>
      </footer>
    </article>
  );
}

export default function DelusionFeed() {
  const [filter, setFilter] = useState<"all" | Tag>("all");
  const [expanded, setExpanded] = useState(false);
  const filtered = memes.filter((m) => filter === "all" || m.tag === filter);
  const visible = filter === "all" && !expanded ? filtered.slice(0, 4) : filtered;

  return (
    <section id="feed" aria-labelledby="feed-title" className="dots relative bg-paper py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <Eyebrow n="03">certified relatable</Eyebrow>
            <h2 id="feed-title" className="section-title">
              The <span className="brush">Delusion</span> Feed
            </h2>
            <p className="mt-5 max-w-lg text-lg">
              Fresh student memes. Emotional damage included at no extra cost.
            </p>
            <Note className="mt-3 block -rotate-1 text-xl">source: group chat.</Note>
          </Reveal>

          <Reveal delay={150}>
            <div role="group" aria-label="Filter memes" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:max-w-md lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0">
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "shrink-0 rounded-full border-2 border-ink px-4 py-2 text-sm font-bold transition-colors",
                    filter === f.key ? "bg-ink text-sun" : "bg-paper hover:bg-sun",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <ul className="mt-12 grid items-start gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-12">
          {visible.map((m, i) => (
            <li key={m.id}>
              <Reveal delay={(i % 2) * 120}>
                <MemeCard meme={m} tilt={i % 2 ? "md:rotate-1" : "md:-rotate-1"} />
              </Reveal>
            </li>
          ))}
        </ul>

        {filter === "all" && !expanded && (
          <div className="mt-14 text-center">
            <button type="button" onClick={() => setExpanded(true)} className="brutal-btn bg-sun text-lg">
              Load more delusions <span aria-hidden>↓</span>
            </button>
            <MiniStamp className="ml-5 hidden -rotate-6 bg-hot align-middle sm:inline-block">I&apos;m cooked</MiniStamp>
          </div>
        )}
        {filter === "all" && expanded && (
          <p className="mt-14 text-center font-hand text-2xl sm:text-3xl">
            <FoundOnMount id="feed-end">
              That&apos;s every meme. You could be studying now. <span className="text-hot">(You won&apos;t.)</span>
            </FoundOnMount>
          </p>
        )}
      </div>
    </section>
  );
}

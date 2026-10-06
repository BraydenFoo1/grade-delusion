import type { Metadata } from "next";
import ContentShell from "@/components/content/ContentShell";
import { Byline, Section } from "@/components/content/Blocks";
import Reveal from "@/components/ui/Reveal";
import { PUBLISHED, article, pages } from "@/lib/content";
import { articleJsonLd, pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

const page = pages.examDelusions;
const info = article(page.path);
const signs = article("/blog/signs-youre-academically-delusional");

export const metadata: Metadata = pageMetadata({ ...page, type: "article", publishedTime: PUBLISHED });

const levels = [
  {
    name: "Mildly Hopeful",
    quote: "I think I’ll be okay.",
    signs: ["Has opened the textbook at least once", "Owns a highlighter, emotionally attached to it"],
  },
  {
    name: "Casually Confident",
    quote: "I’ve definitely seen this topic before.",
    signs: ["Recognises the diagrams", "Cannot explain a single one of them"],
  },
  {
    name: "Selectively Prepared",
    quote: "They’ll probably only test chapters 1 to 3.",
    signs: ["Skipped chapter 4 “strategically”", "Chapter 4 is worth 40 marks"],
  },
  {
    name: "Strategically Delusional",
    quote: "If I memorise the first line of every answer, I can bluff the rest.",
    signs: ["Has a system", "The system is vibes"],
  },
  {
    name: "Professionally Optimistic",
    quote: "The bell curve will save me.",
    signs: ["Has never met the bell curve", "Trusts it completely anyway"],
  },
  {
    name: "Spiritually Prepared",
    quote: "I’m manifesting a pass.",
    signs: ["Lucky pen: ready", "Lucky socks: on", "Notes: unopened"],
  },
  {
    name: "Chronologically Confused",
    quote: "The exam is next week.",
    signs: ["The exam is tomorrow", "Finds out from the group chat at 11pm"],
  },
  {
    name: "Main Character",
    quote: "The examiner will appreciate my creative answers.",
    signs: ["Answers the question they wished was asked", "Draws a diagram for an English paper"],
  },
  {
    name: "Delusion Overflow",
    quote: "I didn’t study, but I have a really good feeling about this.",
    signs: ["Feelings: excellent", "Preparation: not found"],
  },
  {
    name: "EXTREME DELUSION",
    quote: "I’ll finish early and go get bubble tea.",
    signs: ["Has already chosen the bubble tea flavour", "Has not chosen a single answer"],
  },
];

function meterColour(level: number) {
  if (level === 10) return "stripes";
  if (level >= 8) return "bg-hot";
  if (level >= 6) return "bg-sun";
  if (level >= 4) return "bg-volt";
  return "bg-mint";
}

export default function ExamDelusionsPage() {
  return (
    <ContentShell
      accent="sun"
      eyebrow="Self-diagnosis, but make it exam season"
      title={
        <>
          The 10 levels of <span className="brush">exam delusion</span>
        </>
      }
      byline={<Byline readMinutes={info.readMinutes} />}
      intro={
        <>
          Every student climbs this ladder at some point between “the exam is ages away” and “turn over your paper”.
          Some of us skip straight to the top. Find your level below, then take the official{" "}
          <a href="/#test">delusion test</a> on the homepage to confirm the diagnosis.
        </>
      }
      note="(level 10 is a lifestyle, not a phase.)"
      crumbs={[
        { name: pages.blog.label, path: pages.blog.path },
        { name: page.title, path: page.path },
      ]}
      related={[pages.examMemes, signs, pages.blog]}
      jsonLd={[articleJsonLd({ title: page.title, description: page.description, path: page.path, datePublished: PUBLISHED })]}
    >
      <ol role="list" className="mx-auto max-w-4xl space-y-8 px-4 py-14 sm:px-6 sm:py-20">
        {levels.map((level, i) => {
          const n = i + 1;
          return (
            <li key={level.name}>
              <Reveal>
                <article
                  aria-labelledby={`level-${n}`}
                  className={cn(
                    "relative rounded-[1.75rem] border-[3px] border-ink bg-paper p-6 shadow-[7px_7px_0_var(--ink)] sm:p-8",
                    n % 2 ? "sm:-rotate-[0.5deg]" : "sm:rotate-[0.5deg]",
                    n === 10 && "shadow-[9px_9px_0_var(--hot)]",
                  )}
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <span
                      className={cn(
                        "grid size-16 shrink-0 place-items-center rounded-2xl border-[3px] border-ink font-display text-3xl",
                        meterColour(n),
                      )}
                      aria-hidden
                    >
                      <span className={cn(n === 10 && "rounded bg-paper px-1")}>{n}</span>
                    </span>
                    <div className="flex-1">
                      <h2 id={`level-${n}`} className="font-display text-[clamp(1.6rem,4vw,2.4rem)] uppercase leading-none">
                        <span className="sr-only">Level {n}: </span>
                        {level.name}
                      </h2>
                      <p className="mt-3 font-marker text-xl leading-snug sm:text-2xl">“{level.quote}”</p>
                      <ul className="mt-4 space-y-1">
                        {level.signs.map((s) => (
                          <li key={s} className="flex gap-2">
                            <span aria-hidden>✦</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-5">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-[0.2em]">
                          <span id={`meter-${n}`}>Delusion meter</span>
                          <span>{n * 10}%</span>
                        </div>
                        <div
                          role="meter"
                          aria-labelledby={`meter-${n}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={n * 10}
                          className="mt-1.5 h-4 overflow-hidden rounded-full border-[3px] border-ink bg-ink/5"
                        >
                          <div className={cn("h-full border-r-[3px] border-ink", meterColour(n))} style={{ width: `${n * 10}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  {n === 10 && (
                    <span className="stamp absolute -right-2 -top-4 bg-sun text-sm sm:-right-4">⚠ Maximum delusion</span>
                  )}
                </article>
              </Reveal>
            </li>
          );
        })}
      </ol>

      <Section
        id="which-level"
        title="So, which level are you?"
        intro={
          <>
            If you recognised yourself in three or more levels at once, congratulations: that’s normal. Most students
            bounce between level 2 and level 7 depending on how close the exam is and how much bubble tea is involved.
          </>
        }
        className="dots pb-20"
      >
        <div className="flex flex-wrap gap-4">
          <a href="/#test" className="brutal-btn bg-hot">
            Take the delusion test <span aria-hidden>→</span>
          </a>
          <a href={signs.path} className="brutal-btn bg-paper">
            20 signs you’re academically delusional
          </a>
        </div>
      </Section>
    </ContentShell>
  );
}

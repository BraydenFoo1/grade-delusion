import Reveal from "./ui/Reveal";
import { Note } from "./eggs/Decor";
import { Eyebrow, Floating, Sparkle } from "./ui/Doodles";
import { exploreLinks, pages } from "@/lib/content";
import { cn } from "@/lib/utils";

const tones = ["bg-sun", "bg-hot", "bg-mint", "bg-paper", "bg-sun", "bg-hot"];
const tilts = ["-rotate-1", "rotate-1", "-rotate-[0.5deg]", "rotate-[0.5deg]", "rotate-1", "-rotate-1"];

/** Homepage discovery section linking to the content pages. */
export default function ExploreSection() {
  return (
    <section id="explore" aria-labelledby="explore-title" className="relative overflow-hidden bg-ink py-24 text-paper sm:py-28">
      <Floating className="right-[6%] top-16 hidden md:block" dur={6}>
        <Sparkle className="size-11 text-sun" />
      </Floating>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <Eyebrow n="07" className="text-sun">
            more delusion
          </Eyebrow>
          <h2 id="explore-title" className="section-title">
            Enter the <span className="hl [--hl:var(--hot)]">delusion</span>
          </h2>
          <p className="mt-5 max-w-xl text-lg text-paper/85">
            Six rabbit holes of student chaos. Pick one. Your revision can wait. (It can’t.)
          </p>
        </Reveal>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {exploreLinks.map((l, i) => (
            <li key={l.path}>
              <Reveal delay={(i % 3) * 90} className="h-full">
                <a
                  href={l.path}
                  className={cn(
                    "group flex h-full items-start gap-4 rounded-2xl border-[3px] border-ink p-5 text-ink shadow-[6px_6px_0_var(--paper)] transition-all duration-200 hover:-translate-y-1 hover:rotate-0 hover:shadow-[9px_9px_0_var(--sun)]",
                    tones[i],
                    tilts[i],
                  )}
                >
                  <span className="text-4xl" aria-hidden>
                    {l.emoji}
                  </span>
                  <span className="flex-1">
                    <span className="block font-display text-2xl uppercase leading-tight">{l.label}</span>
                    <span className="mt-1 block leading-snug">{l.blurb}</span>
                  </span>
                  <span className="text-2xl transition-transform group-hover:translate-x-1" aria-hidden>
                    →
                  </span>
                </a>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4">
          <a href={pages.blog.path} className="brutal-btn bg-sun text-ink [--btn-shadow:var(--hot)]">
            Read the delusion blog <span aria-hidden>→</span>
          </a>
          <Note className="text-xl text-paper/85">(this counts as revision. it does not.)</Note>
        </Reveal>
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import Reveal from "../ui/Reveal";
import { MiniStamp } from "../eggs/Decor";
import { PUBLISHED, PUBLISHED_LABEL, type Article, type ContentLink } from "@/lib/content";
import { cn } from "@/lib/utils";

const panels = ["bg-sun", "bg-mint", "bg-hot", "bg-volt text-paper"];
const tilts = ["sm:-rotate-1", "sm:rotate-1", "sm:rotate-[0.5deg]", "sm:-rotate-[0.5deg]"];

// ---------- Layout ----------

export function Section({
  id,
  title,
  intro,
  children,
  className,
}: {
  id: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn("mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16", className)}>
      <Reveal>
        <h2 id={`${id}-title`} className="font-display text-[clamp(2rem,5vw,3.25rem)] uppercase leading-[0.95]">
          {title}
        </h2>
        {intro && (
          <p className="mt-3 max-w-2xl text-lg leading-relaxed [&_a]:font-bold [&_a]:underline [&_a]:decoration-hot [&_a]:decoration-2 [&_a]:underline-offset-4">
            {intro}
          </p>
        )}
      </Reveal>
      <div className="mt-8">{children}</div>
    </section>
  );
}

// ---------- Memes ----------

export type Meme = { emoji: string; top: string; bottom: string };
export type MemeGroup = { id: string; title: string; intro: ReactNode; memes: Meme[] };

export function MemeCard({ meme, index }: { meme: Meme; index: number }) {
  return (
    <figure
      className={cn(
        "h-full overflow-hidden rounded-[1.5rem] border-[3px] border-ink bg-paper shadow-[6px_6px_0_var(--ink)] transition-transform duration-300 hover:rotate-0",
        tilts[index % tilts.length],
      )}
    >
      <p className="px-5 pt-5 text-lg font-bold leading-snug">{meme.top}</p>
      <div className={cn("mx-5 mt-4 grid place-items-center rounded-xl border-[3px] border-ink py-6", panels[index % panels.length])}>
        <span className="text-6xl" aria-hidden>
          {meme.emoji}
        </span>
      </div>
      <figcaption className="px-5 pb-6 pt-4 font-marker text-xl leading-snug">{meme.bottom}</figcaption>
    </figure>
  );
}

export function MemeGroups({ groups }: { groups: MemeGroup[] }) {
  return (
    <>
      {groups.map((group, g) => (
        <Section key={group.id} id={group.id} title={group.title} intro={group.intro} className={g % 2 ? "" : "dots"}>
          <ul className="grid gap-8 sm:grid-cols-2">
            {group.memes.map((meme, i) => (
              <li key={meme.top}>
                <Reveal delay={i * 100} className="h-full">
                  <MemeCard meme={meme} index={g + i} />
                </Reveal>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </>
  );
}

// ---------- Quotes ----------

export function QuoteList({ quotes }: { quotes: string[] }) {
  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {quotes.map((q, i) => (
        <li key={q}>
          <blockquote className={cn("bubble h-full", i % 2 ? "rotate-1" : "-rotate-1")}>
            <p className="font-marker text-lg leading-snug">“{q}”</p>
          </blockquote>
        </li>
      ))}
    </ul>
  );
}

// ---------- Articles ----------

export function ArticleCard({ article, index }: { article: Article; index: number }) {
  return (
    <a
      href={article.path}
      className={cn(
        "group flex h-full flex-col rounded-[1.5rem] border-[3px] border-ink bg-paper p-6 shadow-[6px_6px_0_var(--ink)] transition-all duration-200 hover:-translate-y-1 hover:rotate-0 hover:shadow-[9px_9px_0_var(--ink)]",
        tilts[index % tilts.length],
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span className={cn("grid size-14 place-items-center rounded-2xl border-[3px] border-ink text-3xl", panels[index % panels.length])} aria-hidden>
          {article.emoji}
        </span>
        <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wider text-paper">{article.tag}</span>
      </span>
      <span className="mt-5 block font-display text-2xl uppercase leading-tight">{article.title}</span>
      <span className="mt-3 block flex-1 leading-relaxed">{article.blurb}</span>
      <span className="mt-5 flex items-center justify-between text-sm font-bold">
        <span>
          <time dateTime={PUBLISHED}>{PUBLISHED_LABEL}</time> · {article.readMinutes} min read
        </span>
        <span className="text-xl transition-transform group-hover:translate-x-1" aria-hidden>
          →
        </span>
      </span>
    </a>
  );
}

export function Byline({ readMinutes }: { readMinutes: number }) {
  return (
    <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em]">
      By Grade Delusion · <time dateTime={PUBLISHED}>{PUBLISHED_LABEL}</time> · {readMinutes} min read
    </p>
  );
}

/** Long-form article body (headings, paragraphs, lists, links). */
export function ArticleBody({ children }: { children: ReactNode }) {
  return <article className="article mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">{children}</article>;
}

export function Callout({ title, children, tone = "bg-sun" }: { title: string; children: ReactNode; tone?: string }) {
  return (
    <aside className={cn("note tape my-10 -rotate-1 rounded-sm p-6 sm:p-8", tone)} aria-label={title}>
      <p className="font-display text-2xl uppercase">{title}</p>
      <div className="mt-2 [&>*:first-child]:mt-0">{children}</div>
    </aside>
  );
}

/** Numbered list that keeps list semantics even with custom markers. */
export function NumberedList({ start = 1, items }: { start?: number; items: ReactNode[] }) {
  return (
    <ol role="list" start={start} className="!list-none !pl-0 space-y-4">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-sun font-display text-lg">
            {start + i}
          </span>
          <span className="pt-1.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

// ---------- Internal links ----------

export function RelatedLinks({ links }: { links: ContentLink[] }) {
  return (
    <section aria-labelledby="related-title" className="border-t-[3px] border-ink bg-sun">
      <div className="dots mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="related-title" className="font-display text-[clamp(2rem,5vw,3rem)] uppercase leading-none">
            Keep the delusion going
          </h2>
          <MiniStamp className="rotate-3 bg-paper">This counts as revision*</MiniStamp>
        </div>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l, i) => (
            <li key={l.path}>
              <a
                href={l.path}
                className={cn(
                  "group flex h-full items-start gap-4 rounded-2xl border-[3px] border-ink bg-paper p-5 shadow-[5px_5px_0_var(--ink)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[8px_8px_0_var(--ink)]",
                  tilts[i % tilts.length],
                )}
              >
                <span className="text-3xl" aria-hidden>
                  {l.emoji}
                </span>
                <span className="flex-1">
                  <span className="block font-display text-xl uppercase leading-tight">{l.label}</span>
                  <span className="mt-1 block text-sm leading-snug">{l.blurb}</span>
                </span>
                <span className="text-xl transition-transform group-hover:translate-x-1" aria-hidden>
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a href="/" className="brutal-btn bg-ink text-sun [--btn-shadow:var(--hot)]">
            <span aria-hidden>←</span> Back to Grade Delusion
          </a>
          <p className="font-hand text-xl" aria-hidden>
            *it does not.
          </p>
        </div>
      </div>
    </section>
  );
}

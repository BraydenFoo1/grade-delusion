import type { ReactNode } from "react";
import Footer from "../Footer";
import Logo from "../Logo";
import { Note } from "../eggs/Decor";
import { Floating, Sparkle, Star } from "../ui/Doodles";
import { RelatedLinks } from "./Blocks";
import { pages, type ContentLink } from "@/lib/content";
import { breadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

const accents = {
  sun: "bg-sun text-ink",
  hot: "bg-hot text-ink",
  volt: "bg-volt text-paper",
  mint: "bg-mint text-ink",
} as const;

export type Crumb = { name: string; path: string };

/** Shared layout for content pages and blog articles: header, breadcrumbs, hero,
 *  "keep exploring" links, footer and JSON-LD (BreadcrumbList is generated from the crumbs). */
export default function ContentShell({
  accent,
  eyebrow,
  title,
  intro,
  crumbs,
  related,
  byline,
  note,
  jsonLd = [],
  children,
}: {
  accent: keyof typeof accents;
  eyebrow: string;
  title: ReactNode;
  intro: ReactNode;
  /** Trail after "Home"; the last crumb is the current page. */
  crumbs: Crumb[];
  related: ContentLink[];
  byline?: ReactNode;
  note?: string;
  jsonLd?: object[];
  children: ReactNode;
}) {
  const trail: Crumb[] = [{ name: "Home", path: "/" }, ...crumbs];
  const structuredData = [breadcrumbJsonLd(trail), ...jsonLd];

  return (
    <>
      <a
        href="#main"
        className="sr-only z-[100] rounded-lg bg-ink px-4 py-2 font-bold text-sun focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <header className={cn("dots relative overflow-hidden border-b-[3px] border-ink", accents[accent])}>
        <Floating className="right-[7%] top-28 hidden sm:block" dur={6}>
          <Star className="size-10 text-paper" />
        </Floating>
        <Floating className="bottom-10 right-[18%] hidden lg:block" dur={7} delay={1}>
          <Sparkle className="size-8 text-mint" />
        </Floating>

        <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Logo href="/" />
          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
            <ul className="hidden items-center gap-1 md:flex">
              {[pages.studentMemes, pages.examDelusions, pages.blog].map((l) => (
                <li key={l.path}>
                  <a
                    href={l.path}
                    className="rounded-full px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition-colors hover:bg-paper hover:text-ink"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <a href="/" className="brutal-btn bg-paper px-4 py-2 text-sm text-ink">
              <span aria-hidden>←</span> Home
            </a>
          </nav>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-4 sm:px-6 sm:pb-20">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold">
              {trail.map((crumb, i) => (
                <li key={crumb.path} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden>/</span>}
                  {i < trail.length - 1 ? (
                    <a href={crumb.path} className="underline decoration-2 underline-offset-4 hover:no-underline">
                      {crumb.name}
                    </a>
                  ) : (
                    <span aria-current="page" className="font-medium">
                      {crumb.name}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <p className="mt-8 inline-flex -rotate-2 rounded-full border-[3px] border-ink bg-paper px-4 py-1 text-xs font-bold uppercase tracking-widest text-ink shadow-[3px_3px_0_var(--ink)]">
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-[clamp(2.6rem,8.5vw,5.75rem)] uppercase leading-[0.92]">{title}</h1>
          {byline}
          <div className="mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl [&_a]:font-bold [&_a]:underline [&_a]:decoration-2 [&_a]:underline-offset-4">
            {intro}
          </div>
          {note && <Note className="mt-5 block -rotate-1 text-2xl">{note}</Note>}
        </div>
      </header>

      <main id="main" className="bg-paper">
        {children}
        <RelatedLinks links={related} />
      </main>
      <Footer />
      {structuredData.map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      ))}
    </>
  );
}

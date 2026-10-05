import type { ReactNode } from "react";
import Footer from "./Footer";
import Logo from "./Logo";
import { legal } from "@/lib/site";

export default function LegalPage({
  title,
  intro,
  summary,
  children,
}: {
  title: string;
  intro: ReactNode;
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[100] rounded-lg bg-ink px-4 py-2 font-bold text-sun focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <header className="dots border-b-[3px] border-ink bg-sun">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Logo href="/" />
          <a href="/" className="brutal-btn bg-paper px-4 py-2 text-sm">
            <span aria-hidden>←</span> Back to the delusion
          </a>
        </div>
        <div className="mx-auto max-w-4xl px-4 pb-14 pt-10 sm:px-6">
          <h1 className="font-display text-[clamp(3rem,10vw,6rem)] uppercase leading-[0.9]">{title}</h1>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em]">Last updated: {legal.lastUpdated}</p>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed">{intro}</p>
        </div>
      </header>

      <main id="main" className="bg-paper">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
          <aside className="note tape -rotate-1 rounded-sm bg-mint p-6 sm:p-8" aria-label="Summary">
            <p className="font-display text-2xl uppercase">The short version</p>
            <div className="legal mt-2">{summary}</div>
          </aside>
          <article className="legal mt-14">{children}</article>
        </div>
      </main>
      <Footer />
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const REDIRECT_MS = 2000;

/** Sticky top bar. Students stay; parents get a 2-second joke and are sent to Grade Solution. Nothing is stored. */
export default function StudentParentSwitcher() {
  const [redirecting, setRedirecting] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const chooseParent = () => {
    if (redirecting) return;
    setRedirecting(true);
    timer.current = window.setTimeout(() => window.location.assign(site.gradeSolutionUrl), REDIRECT_MS);
  };

  const stay = () => {
    window.clearTimeout(timer.current);
    setRedirecting(false);
  };

  return (
    <>
      <section
        data-gd-topbar
        aria-label="Student or parent"
        className="fixed inset-x-0 top-0 z-[45] flex h-11 items-center justify-center gap-2 border-b-[3px] border-ink bg-ink px-3 text-paper"
      >
        <span className="hidden text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sun sm:inline">Who’s reading?</span>
        <div role="group" aria-label="Who is reading?" className="flex gap-1.5">
          <button
            type="button"
            aria-pressed={!redirecting}
            onClick={stay}
            className={cn(
              "rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors sm:text-sm",
              !redirecting ? "border-sun bg-sun text-ink" : "border-paper/40 text-paper hover:bg-paper/15",
            )}
          >
            I’m a Student 🤡
          </button>
          <button
            type="button"
            aria-pressed={redirecting}
            onClick={chooseParent}
            className={cn(
              "rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors sm:text-sm",
              redirecting ? "border-hot bg-hot text-paper" : "border-paper/40 text-paper hover:bg-paper/15",
            )}
          >
            I’m a Parent 👀
          </button>
        </div>
      </section>

      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-14 z-[56] flex justify-center px-4">
        {redirecting && (
          <div className="pop pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border-[3px] border-ink bg-sun p-4 text-ink shadow-[6px_6px_0_var(--hot)]">
            <span className="text-2xl" aria-hidden>
              🚨
            </span>
            <div>
              <p className="font-bold leading-snug">
                Detected an adult. Redirecting you to the Serious Zone before you see their study habits…
              </p>
              <button type="button" onClick={stay} className="mt-2 text-sm font-bold uppercase tracking-wide underline underline-offset-4">
                Stay here
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

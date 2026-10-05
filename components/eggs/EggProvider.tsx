"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

// Every interactive secret on the site. Progress lives in memory only (nothing is
// stored on the visitor's device, matching the Privacy Policy) and resets on reload.
export const EGG_IDS = [
  "skull",
  "sparkle",
  "star",
  "level-note",
  "feed-end",
  "generator-10",
  "exam-ready",
  "footer-dots",
  "tm",
] as const;
export type EggId = (typeof EGG_IDS)[number];

const TIERS = [
  { at: 3, title: "Professional Procrastinator", note: "3 secrets found instead of revising. Impressive. Concerning." },
  { at: 6, title: "Certified Delusional", note: "6 secrets found. Your study timetable felt that." },
  { at: EGG_IDS.length, title: "CEO of Confidence", note: `All ${EGG_IDS.length} secrets found. There is still no prize.` },
];

// `anchor` is the element that revealed the secret; the toast appears at the opposite end of the
// screen so it never covers the message the visitor just found.
const EggContext = createContext<{ find: (id: EggId, anchor?: Element | null) => void }>({ find: () => {} });

export const useEggs = () => useContext(EggContext);

export default function EggProvider({ children }: { children: ReactNode }) {
  const found = useRef(new Set<EggId>());
  const timer = useRef<number | undefined>(undefined);
  const [toast, setToast] = useState<((typeof TIERS)[number] & { atTop: boolean }) | null>(null);

  const find = useCallback((id: EggId, anchor?: Element | null) => {
    if (found.current.has(id)) return;
    found.current.add(id);
    const tier = TIERS.find((t) => t.at === found.current.size);
    if (!tier) return;
    const rect = anchor?.getBoundingClientRect();
    setToast({ ...tier, atTop: !!rect && rect.top + rect.height / 2 > window.innerHeight / 2 });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 7000);
  }, []);

  useEffect(() => {
    // For the people who open DevTools on a meme website.
    console.log(
      "%cGRADE DELUSION™%c\nYou opened the developer console instead of studying.\nThis counts as revision. (It does not.)",
      "font: 900 28px Impact, sans-serif; color: #ffe11a; background: #0b0b0f; padding: 4px 10px;",
      "font: 14px monospace; color: inherit;",
    );
    // Switch tabs and the page notices.
    const original = document.title;
    const onVisibility = () => {
      document.title = document.hidden ? "Come back. The syllabus misses you. 😭" : original;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.title = original;
      window.clearTimeout(timer.current);
    };
  }, []);

  const value = useMemo(() => ({ find }), [find]);

  return (
    <EggContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4 ${toast?.atTop ? "top-24" : "bottom-4"}`}
      >
        {toast && (
          <div
            key={toast.title}
            className="pop pointer-events-auto relative flex max-w-sm items-start gap-3 rounded-2xl border-[3px] border-ink bg-ink p-4 pr-11 text-paper shadow-[6px_6px_0_var(--hot)]"
          >
            <span className="text-3xl" aria-hidden>
              🏆
            </span>
            <div>
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sun">Delusion achievement unlocked</p>
              <p className="font-display text-2xl uppercase leading-tight">{toast.title}</p>
              <p className="mt-1 text-sm text-paper/85">{toast.note}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss achievement"
              className="absolute right-2 top-2 grid size-8 place-items-center rounded-full text-xl leading-none hover:bg-paper/15"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </EggContext.Provider>
  );
}

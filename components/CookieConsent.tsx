"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { onConsentChange, readConsent, writeConsent, type ConsentValue } from "@/lib/consent";
import { legal } from "@/lib/site";

// The banner uses fixed colours (not the theme tokens) so it stays readable in the platform's dark theme.
// "server" while rendering on the server and during hydration, so the banner never causes a mismatch.
type Snapshot = ConsentValue | "undecided" | "server";

const getSnapshot = (): Snapshot => readConsent() ?? "undecided";
const getServerSnapshot = (): Snapshot => "server";

/**
 * Non-blocking cookie-information banner with one "Got it" button. It saves the acknowledgement locally and closes.
 * It starts no script: the site has no analytics, advertising pixels or tracking (see docs/CONSENT.md).
 */
export default function CookieConsent() {
  const choice = useSyncExternalStore(onConsentChange, getSnapshot, getServerSnapshot);
  const visible = choice === "undecided";
  const ref = useRef<HTMLElement>(null);

  // Reserve space under the page while the banner is up, so it never covers the Footer.
  useEffect(() => {
    const root = document.documentElement;
    if (!visible) return;
    root.dataset.gdConsentPending = "1";
    const el = ref.current;
    const update = () => root.style.setProperty("--gd-banner-h", `${el?.offsetHeight ?? 160}px`);
    update();
    // Focus Not Obscured (WCAG 2.4.11): if keyboard focus lands on something the banner covers, scroll it clear.
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !el || el.contains(target)) return;
      if (!target.matches(":focus-visible")) return; // keyboard focus only: never move the page under a mouse or touch click
      const t = target.getBoundingClientRect();
      const top = el.getBoundingClientRect().top;
      if (t.bottom > top && t.top < window.innerHeight) window.scrollBy({ top: t.bottom - top + 24, behavior: "instant" });
    };
    document.addEventListener("focusin", onFocusIn);
    const ro = typeof ResizeObserver !== "undefined" && el ? new ResizeObserver(update) : null;
    if (ro && el) ro.observe(el);
    return () => {
      ro?.disconnect();
      document.removeEventListener("focusin", onFocusIn);
      delete root.dataset.gdConsentPending;
      root.style.removeProperty("--gd-banner-h");
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <section
      ref={ref}
      aria-label="Cookie information"
      className="fixed inset-x-0 bottom-0 z-[55] px-3 pb-3 sm:px-5 sm:pb-5"
    >
      <div className="pop mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border-[3px] border-[#0b0b0f] bg-[#fffdf5] p-3 text-[#0b0b0f] shadow-[6px_6px_0_#0b0b0f] min-[380px]:flex-row min-[380px]:items-center min-[380px]:gap-3 sm:gap-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-bold leading-tight sm:text-base sm:leading-snug">
            🍪 Cookies? Even our browser needs a little revision. Have a look at our cookie information, then carry on.
          </p>
          <p className="mt-0.5 text-sm text-[#0b0b0f]/75 sm:mt-1">
            <a href={legal.privacy} className="font-bold underline underline-offset-4">
              Privacy Policy
            </a>
            {" · "}
            <a href={legal.terms} className="font-bold underline underline-offset-4">
              Terms of Use
            </a>
          </p>
        </div>
        <button
          type="button"
          onClick={() => writeConsent()}
          className="brutal-btn shrink-0 justify-center border-[#0b0b0f] bg-[#ffe11a] px-4 py-2.5 text-center text-sm text-[#0b0b0f] [--btn-shadow:#0b0b0f] sm:px-5"
        >
          Got it 🤡
        </button>
      </div>
    </section>
  );
}

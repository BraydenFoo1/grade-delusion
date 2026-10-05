"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";
import { Star } from "./ui/Doodles";
import { navLinks, site } from "@/lib/site";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth >= 1024 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <nav
        aria-label="Main"
        className={cn(
          "relative mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl border-[3px] border-ink bg-paper px-3 py-2 transition-shadow duration-300 sm:px-5",
          scrolled || open ? "shadow-[5px_5px_0_var(--ink)]" : "shadow-none",
        )}
      >
        <Logo onClick={close} />

        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-full px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition-colors hover:bg-sun"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a href="#test" className="brutal-btn hidden bg-hot px-4 py-2 text-sm sm:inline-flex">
            Am I delusional?
          </a>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-11 place-items-center rounded-xl border-[3px] border-ink bg-sun lg:hidden"
          >
            <span className="relative block h-4 w-5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "absolute left-0 h-[3px] w-full rounded-full bg-ink transition-all duration-300",
                    i === 0 && (open ? "top-1.5 rotate-45" : "top-0"),
                    i === 1 && (open ? "top-1.5 opacity-0" : "top-1.5"),
                    i === 2 && (open ? "top-1.5 -rotate-45" : "top-3"),
                  )}
                />
              ))}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile menu: full-screen sticker sheet */}
      <div
        id="mobile-menu"
        className={cn(
          "dots fixed inset-0 -z-10 flex flex-col bg-sun px-6 pb-10 pt-28 transition-all duration-300 lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
        aria-hidden={!open}
      >
        <ul className="flex flex-1 flex-col justify-center gap-1">
          {navLinks.map((l, i) => (
            <li
              key={l.href}
              className="transition-all duration-500"
              style={{
                transitionDelay: open ? `${80 + i * 50}ms` : "0ms",
                opacity: open ? 1 : 0,
                translate: open ? "0 0" : "0 20px",
              }}
            >
              <a
                href={l.href}
                onClick={close}
                tabIndex={open ? 0 : -1}
                className="group flex items-baseline gap-3 font-display text-[clamp(2.75rem,13vw,4.5rem)] uppercase leading-[1.02]"
              >
                <span className="font-sans text-sm font-bold opacity-50">0{i + 1}</span>
                <span className="transition-transform group-hover:translate-x-2 group-active:text-hot">{l.label}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-end justify-between gap-4">
          <p className="max-w-[14rem] font-marker text-xl leading-tight">“{site.tagline}”</p>
          <Star className="bob size-14 text-hot" />
        </div>
      </div>
    </header>
  );
}

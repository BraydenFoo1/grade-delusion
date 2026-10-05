"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useClipboard(resetAfter = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Fallback for insecure contexts / older browsers.
        const el = document.createElement("textarea");
        el.value = text;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        el.remove();
      }
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), resetAfter);
    },
    [resetAfter],
  );

  return { copied, copy };
}

export type Particle = { id: number; char: string; tx: number; ty: number; rot: number };

/** Emoji confetti. Render the returned particles with <BurstLayer />. */
export function useBurst() {
  const [parts, setParts] = useState<Particle[]>([]);
  const nextId = useRef(0);

  const fire = useCallback((chars: string[], count = 10, spread = 160) => {
    const batch: Particle[] = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = spread * (0.45 + Math.random() * 0.65);
      return {
        id: nextId.current++,
        char: chars[Math.floor(Math.random() * chars.length)],
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 30,
        rot: (Math.random() - 0.5) * 140,
      };
    });
    const ids = new Set(batch.map((p) => p.id));
    setParts((p) => [...p, ...batch]);
    window.setTimeout(() => setParts((p) => p.filter((x) => !ids.has(x.id))), 1000);
  }, []);

  return { parts, fire };
}

/** Animate a number from 0 to `target` once `active` is true. */
export function useCountUp(target: number, active: boolean, duration = 1300) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

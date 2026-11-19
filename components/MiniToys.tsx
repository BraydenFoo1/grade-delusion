"use client";

import { useState } from "react";
import Reveal from "./ui/Reveal";
import DustOMeter from "./toys/DustOMeter";
import CertificateGenerator from "./toys/CertificateGenerator";
import ExamEightBall from "./toys/ExamEightBall";
import { handleTabKeys } from "./toys/shared";
import { Eyebrow } from "./ui/Doodles";
import { cn } from "@/lib/utils";

const TOYS = [
  { id: "dust", label: "TYS Dust-O-Meter", emoji: "📚" },
  { id: "certificate", label: "Certificate of Delusion", emoji: "📜" },
  { id: "eightball", label: "Will It Come Out?", emoji: "🎱" },
] as const;

/** Three mini-toys. All panels stay mounted (hidden when inactive) so each toy keeps its state. Nothing is stored or sent. */
export default function MiniToys() {
  const [index, setIndex] = useState(0);

  return (
    <section id="toys" aria-labelledby="toys-title" className="relative overflow-hidden bg-mint py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal className="text-center">
          <Eyebrow n="5c" className="text-ink">
            procrastination toys
          </Eyebrow>
          <h2 id="toys-title" className="section-title mx-auto max-w-4xl">
            Three ways to <span className="hl [--hl:var(--sun)]">avoid</span> studying
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg">Strictly for entertainment. Runs in your browser. We don’t see or keep anything you type.</p>
        </Reveal>

        <Reveal delay={150} className="mx-auto mt-12 max-w-3xl">
          <div className="rounded-[2rem] border-[3px] border-ink bg-paper p-4 shadow-[10px_10px_0_var(--ink)] sm:p-8">
            <div role="tablist" aria-label="Pick a toy" className="grid gap-2 sm:grid-cols-3 sm:gap-3">
              {TOYS.map((t, i) => (
                <button
                  key={t.id}
                  id={`toys-tab-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-controls={`toys-panel-${i}`}
                  tabIndex={i === index ? 0 : -1}
                  onClick={() => setIndex(i)}
                  onKeyDown={(e) => handleTabKeys(e, i, TOYS.length, setIndex, "toys")}
                  className={cn(
                    "rounded-xl border-[3px] border-ink px-3 py-3 text-sm font-bold uppercase tracking-wide transition-all",
                    i === index ? "bg-sun shadow-none" : "bg-paper shadow-[3px_3px_0_var(--ink)] hover:bg-sun/60",
                  )}
                >
                  <span aria-hidden>{t.emoji} </span>
                  {t.label}
                </button>
              ))}
            </div>

            {[<DustOMeter key="d" />, <CertificateGenerator key="c" />, <ExamEightBall key="e" />].map((toy, i) => (
              <div
                key={TOYS[i].id}
                id={`toys-panel-${i}`}
                role="tabpanel"
                aria-labelledby={`toys-tab-${i}`}
                hidden={i !== index}
                className="mt-6"
              >
                {toy}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

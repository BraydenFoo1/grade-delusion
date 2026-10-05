import Reveal from "./ui/Reveal";
import { Arrow, Floating, Sparkle, Splash, Squiggle, Star, Underline } from "./ui/Doodles";
import { cn, vars } from "@/lib/utils";

const thoughts = [
  { q: "Think you got an A?", verdict: "Delusion.", stamp: "bg-hot text-ink", tilt: "-rotate-2", indent: "" },
  { q: "Think you studied enough?", verdict: "Delusion.", stamp: "bg-volt text-paper", tilt: "rotate-2", indent: "sm:ml-14 lg:ml-12" },
  {
    q: "Think the exam will be easy?",
    verdict: "Extreme delusion.",
    stamp: "bg-ink text-sun",
    tilt: "-rotate-1",
    indent: "sm:ml-4 lg:-ml-4",
  },
];

export default function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="dots relative overflow-hidden bg-sun pb-20 pt-28 sm:pt-32 lg:pb-28 lg:pt-40"
    >
      {/* Decorations */}
      <Splash className="pointer-events-none absolute -right-28 -top-24 w-[380px] text-hot sm:w-[520px] lg:-right-16 lg:-top-10 lg:w-[620px]" />
      <Splash className="pointer-events-none absolute -bottom-28 -left-24 w-64 rotate-45 text-volt sm:w-80" />
      <Floating className="left-[4%] top-24 hidden sm:block" dur={5}>
        <Star className="size-10 text-paper" />
      </Floating>
      <Floating className="right-[46%] top-28 hidden lg:block" dur={7} delay={1}>
        <Sparkle className="size-9 text-mint" />
      </Floating>
      <Floating className="bottom-16 left-[48%] hidden text-5xl lg:block" dur={6} delay={0.5}>
        🧠
      </Floating>
      <Floating className="right-5 top-[42%] text-4xl sm:right-10" dur={5.5} delay={1.2}>
        💀
      </Floating>
      <Floating className="bottom-10 right-[8%] hidden text-4xl sm:block" dur={6.5}>
        ✏️
      </Floating>
      <Floating className="left-[40%] top-24 hidden text-4xl xl:block" dur={8} delay={2}>
        🎓
      </Floating>

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-12 lg:gap-6">
        {/* Copy */}
        <div className="lg:col-span-7">
          <Reveal>
            <p className="inline-flex -rotate-2 items-center gap-2 rounded-full border-[3px] border-ink bg-mint px-4 py-1.5 text-xs font-bold uppercase tracking-widest shadow-[3px_3px_0_var(--ink)] sm:text-sm">
              <span className="size-2 animate-pulse-dot rounded-full bg-ink" aria-hidden />
              Now accepting delusional students
            </p>
          </Reveal>

          <h1
            id="hero-title"
            className="mt-7 font-display uppercase leading-[0.86] tracking-tight text-[clamp(3.5rem,19vw,9rem)]"
          >
            <span className="block text-[0.42em] tracking-wide">Welcome to</span>
            <span className="block">Grade</span>
            <span className="brush">Delusion</span>
            <span className="align-top font-sans text-[0.3em] font-bold">™</span>
          </h1>

          <Reveal delay={250} className="relative mt-7 inline-block">
            <p className="write px-1 py-1 font-marker text-[clamp(1.45rem,4.2vw,2.6rem)] leading-tight">
              “All students only have{" "}
              <span className="relative inline-block">
                delusions.”
                <Underline className="absolute -bottom-3 left-0 h-5 w-full text-hot [--dd:1.1s]" />
              </span>
            </p>
          </Reveal>

          <Reveal delay={400}>
            <p className="mt-9 max-w-xl text-lg font-medium leading-relaxed sm:text-xl">
              The official home of <strong className="hl [--hl:var(--paper)]">100% confidence</strong> and{" "}
              <strong className="hl [--hl:var(--paper)]">0% evidence</strong>. Memes, mini-games and a scientifically
              questionable delusion test — for every student who has ever said “I&apos;ll start tomorrow.”
            </p>
          </Reveal>

          <Reveal delay={550} className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <a href="#what" className="brutal-btn wiggle-hover justify-center bg-ink text-lg text-sun [--btn-shadow:var(--hot)]">
              Enter the delusion <span aria-hidden>→</span>
            </a>
            <a href="#feed" className="brutal-btn justify-center bg-paper text-lg">
              Meet the delusionals <span aria-hidden>💀</span>
            </a>
          </Reveal>

          <Reveal delay={700}>
            <p className="mt-7 flex flex-wrap items-center gap-x-3 font-hand text-2xl">
              <span className="font-sans text-base tracking-[0.2em]" aria-label="5 stars">★★★★★</span>
              rated “too real” by 0 verified examiners
            </p>
          </Reveal>
        </div>

        {/* Floating thought bubbles */}
        <div className="relative lg:col-span-5">
          <Reveal className="mb-6 flex items-end gap-2 lg:-ml-6">
            <p className="-rotate-3 font-hand text-2xl leading-none sm:text-3xl">common student thoughts:</p>
            <Arrow className="h-12 w-16 rotate-[100deg] [--dd:0.6s]" />
          </Reveal>
          <ul className="flex flex-col gap-12">
            {thoughts.map((t, i) => (
              <li key={t.q} className={t.indent}>
                <div
                  className="float relative"
                  style={vars({ "--dur": `${5 + i * 0.8}s`, "--delay": `${i * 0.5}s` })}
                >
                  <div
                    className={cn("bubble pop max-w-sm", t.tilt)}
                    style={vars({ "--d": `${350 + i * 380}ms` })}
                  >
                    <p className="pr-6 text-xl font-bold sm:text-2xl">{t.q}</p>
                  </div>
                  <span
                    className={cn(
                      "stamp slam absolute -bottom-7 right-0 text-xl sm:right-auto sm:left-56 sm:text-2xl",
                      t.stamp,
                    )}
                    style={vars({ "--d": `${900 + i * 380}ms` })}
                  >
                    {t.verdict}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <Squiggle className="draw-now mt-12 hidden h-6 w-32 text-ink sm:block lg:ml-auto [--dd:2s]" />
        </div>
      </div>
    </section>
  );
}

import Reveal from "./ui/Reveal";
import { MiniStamp, Note } from "./eggs/Decor";
import { BrandIcon, type Brand } from "./ui/BrandIcons";
import { Eyebrow, Floating, Splash, Star } from "./ui/Doodles";
import { legal, site } from "@/lib/site";
import { cn } from "@/lib/utils";

const channels: { name: Brand; href: string; note: string; style: string; tilt: string }[] = [
  { name: "Instagram", href: site.socials.instagram, note: "memes & exam chaos", style: "bg-hot", tilt: "-rotate-2" },
  { name: "YouTube", href: site.socials.youtube, note: "longer delusions", style: "bg-volt text-paper", tilt: "rotate-1" },
  { name: "Facebook", href: site.socials.facebook, note: "for your parents to find", style: "bg-mint", tilt: "rotate-2" },
];

export default function JoinSocials() {
  return (
    <section id="socials" aria-labelledby="socials-title" className="dots relative overflow-hidden bg-sun py-24 sm:py-36">
      <Splash className="pointer-events-none absolute -right-24 -top-16 w-80 text-hot sm:w-[28rem]" />
      <Splash className="pointer-events-none absolute -bottom-40 -left-28 w-64 -rotate-90 text-volt sm:-bottom-24 sm:-left-20 sm:w-72" />
      <Floating className="left-[8%] top-24 hidden sm:block" dur={6}>
        <Star className="size-12 text-paper" />
      </Floating>
      <Floating className="bottom-28 right-[10%] hidden text-5xl md:block" dur={5.5} delay={0.8}>
        😂
      </Floating>

      <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
        <Reveal className="relative">
          <Eyebrow n="07">the group chat</Eyebrow>
          <MiniStamp className="absolute right-[6%] top-28 hidden rotate-12 bg-paper md:inline-block">
            Trust the process
          </MiniStamp>
          <h2
            id="socials-title"
            className="font-display text-[clamp(3.6rem,15vw,11rem)] uppercase leading-[0.84] tracking-tight"
          >
            Join the
            <br />
            <span className="brush">delusion.</span>
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-lg font-medium leading-relaxed sm:text-xl">
            Follow us for student memes, exam chaos, questionable confidence and absolutely unnecessary levels of
            optimism.
          </p>
        </Reveal>

        <ul className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
          {channels.map((c, i) => (
            <li key={c.name} className={cn(i === channels.length - 1 && "col-span-2 sm:col-span-1")}>
              <Reveal delay={i * 90}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Grade Delusion on ${c.name} (opens in a new tab)`}
                  className={cn(
                    "group flex flex-col justify-between rounded-3xl border-[3px] border-ink p-4 text-left shadow-[6px_6px_0_var(--ink)] transition-all duration-200 hover:-translate-y-1.5 hover:rotate-0 hover:shadow-[10px_10px_0_var(--ink)] active:translate-y-1 active:shadow-none sm:aspect-[4/5] sm:p-6",
                    c.style,
                    c.tilt,
                    i === channels.length - 1 ? "aspect-[2/1]" : "aspect-square",
                  )}
                >
                  <span className="flex items-start justify-between">
                    <span className="transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110">
                      <BrandIcon name={c.name} className="size-9 sm:size-10" />
                    </span>
                    <span
                      className="text-2xl transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1"
                      aria-hidden
                    >
                      ↗
                    </span>
                  </span>
                  <span>
                    <span className="block font-display text-[clamp(1.35rem,4.5vw,2rem)] uppercase leading-none">
                      {c.name}
                    </span>
                    <span className="mt-1 block font-hand text-lg leading-tight sm:text-xl">{c.note}</span>
                  </span>
                </a>
              </Reveal>
            </li>
          ))}
        </ul>
        <Note className="mx-auto mt-6 block max-w-4xl text-right text-xl sm:text-2xl">follow us. then go study. (you won&apos;t.)</Note>

        <Reveal className="mt-14">
          <p className="text-lg">
            Got a delusion to share?{" "}
            <a
              href={`mailto:${site.email}`}
              className="font-bold underline decoration-hot decoration-[3px] underline-offset-4 hover:bg-ink hover:text-sun"
            >
              Send it to us
            </a>{" "}
            — the best ones get featured. <span className="font-hand text-2xl">(fame is also a delusion)</span>
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed">
            By sending us something, you agree to our{" "}
            <a href={`${legal.terms}#submissions`} className="font-bold underline underline-offset-2">
              submission rules
            </a>
            . Under 13? Please get a parent or guardian&apos;s OK first. Don&apos;t include other people&apos;s names
            or faces without their permission.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import ContentShell from "@/components/content/ContentShell";
import { Section } from "@/components/content/Blocks";
import Reveal from "@/components/ui/Reveal";
import { pages } from "@/lib/content";
import { site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

const page = pages.studentLife;

export const metadata: Metadata = pageMetadata(page);

const chapters = [
  {
    emoji: "⏰",
    title: "Mornings",
    text: "Snoozing is a competitive sport and every student is a professional. The day officially starts when you’re already late.",
    moments: [
      "Five alarms, each one more disappointed in you",
      "Breakfast: half a slice of bread, eaten while running",
      "Arriving exactly on time, spiritually late",
    ],
  },
  {
    emoji: "🏫",
    title: "Lessons",
    text: "Physically present, mentally on holiday. You nod at the right moments and hope nobody asks a follow-up question.",
    moments: [
      "Copying notes you’ll “definitely read later”",
      "The clock moving slower in the last lesson of the day",
      "Making eye contact with the teacher by accident and getting picked",
    ],
  },
  {
    emoji: "🍜",
    title: "Canteen & lunch",
    text: "The real reason anyone shows up. Lunch planning begins at roughly 8:01am.",
    moments: [
      "Debating the same two food stalls every single day",
      "The queue that only moves fast when you’re not hungry",
      "Saving seats like it’s a military operation",
    ],
  },
  {
    emoji: "🤝",
    title: "CCA & group projects",
    text: "Teamwork makes the dream work. Eventually. After three reminders and one dramatic group-chat message.",
    moments: [
      "One person doing the whole project while everyone else “provides ideas”",
      "Practice that was “only one hour” (it was three)",
      "Bonding over shared suffering, the strongest friendship glue",
    ],
  },
  {
    emoji: "📚",
    title: "Tuition & homework",
    text: "The second shift. School ends, the learning doesn’t. Your bag weighs the same as a small refrigerator.",
    moments: [
      "Homework due tomorrow, discovered tonight",
      "Tuition snacks: the only thing keeping you going",
      "Finishing your worksheet in the lift on the way up",
    ],
  },
  {
    emoji: "🛋️",
    title: "Weekends",
    text: "Two days of ambitious plans, executed as one long nap and a frantic Sunday night.",
    moments: [
      "Saturday: “I have so much time.”",
      "Sunday 9pm: the realisation",
      "Doing a week’s homework during the last episode of a series",
    ],
  },
  {
    emoji: "📊",
    title: "Results season",
    text: "Refresh. Panic. Refresh. The emotional rollercoaster nobody signed up for, with a queue that never ends.",
    moments: [
      "Pretending you’ve forgotten results come out tomorrow",
      "Comparing results only with the friends who did worse",
      "Promising yourself you’ll study properly next term (ha)",
    ],
  },
];

const tones = ["bg-sun", "bg-mint", "bg-paper", "bg-hot", "bg-sun", "bg-mint", "bg-paper"];

export default function StudentLifePage() {
  return (
    <ContentShell
      accent="hot"
      eyebrow="A documentary, basically"
      title={
        <>
          Student life: the chaos, memes &amp; <span className="brush">delusions</span>
        </>
      }
      intro={
        <>
          Early alarms, long queues, group projects and the eternal promise to start studying “next week”. If any of
          this feels personal, you’ll love our <a href={pages.studentMemes.path}>student memes</a>.
        </>
      }
      note="(certified accurate by people who should be revising.)"
      crumbs={[{ name: page.label, path: page.path }]}
      related={[pages.studentMemes, pages.quotes, pages.blog]}
    >
      <Section id="a-day-in-the-life" title="A day (and a term) in the life" className="dots">
        <ol role="list" className="grid gap-8 md:grid-cols-2">
          {chapters.map((c, i) => (
            <li key={c.title}>
              <Reveal delay={(i % 2) * 100} className="h-full">
                <article
                  aria-labelledby={`chapter-${i}`}
                  className={cn(
                    "h-full rounded-[1.5rem] border-[3px] border-ink p-6 shadow-[6px_6px_0_var(--ink)]",
                    tones[i],
                    i % 2 ? "sm:rotate-[0.5deg]" : "sm:-rotate-[0.5deg]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-4xl" aria-hidden>
                      {c.emoji}
                    </span>
                    <h3 id={`chapter-${i}`} className="font-display text-3xl uppercase leading-none">
                      {c.title}
                    </h3>
                  </div>
                  <p className="mt-3 leading-relaxed">{c.text}</p>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em]">Relatable moments</p>
                  <ul className="mt-2 space-y-1.5">
                    {c.moments.map((m) => (
                      <li key={m} className="flex gap-2">
                        <span aria-hidden>✦</span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="survival-kit"
        title="The unofficial student survival kit"
        intro={
          <>
            Not endorsed by any teacher. For the official, actually-useful version, ask{" "}
            <a href={site.gradeSolutionUrl} target="_blank" rel="noopener noreferrer">
              Grade Solution
            </a>
            .
          </>
        }
      >
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["🖊️", "Three pens", "Two will mysteriously vanish."],
            ["🔋", "A power bank", "For the 2am “revision”."],
            ["🍪", "Emergency snacks", "Brain fuel. Allegedly."],
            ["🧠", "Unshakeable confidence", "Evidence not included."],
          ].map(([emoji, item, note], i) => (
            <li
              key={item}
              className={cn(
                "rounded-2xl border-[3px] border-ink bg-paper p-5 shadow-[4px_4px_0_var(--ink)]",
                i % 2 ? "rotate-1" : "-rotate-1",
              )}
            >
              <span className="text-3xl" aria-hidden>
                {emoji}
              </span>
              <p className="mt-2 font-bold">{item}</p>
              <p className="font-hand text-xl leading-tight">{note}</p>
            </li>
          ))}
        </ul>
      </Section>
    </ContentShell>
  );
}

import type { Metadata } from "next";
import ContentShell from "@/components/content/ContentShell";
import { QuoteList, Section } from "@/components/content/Blocks";
import { article, pages } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

const page = pages.quotes;
const sayings = article("/blog/funny-things-students-say-before-an-exam");

export const metadata: Metadata = pageMetadata(page);

const groups = [
  {
    id: "in-class",
    title: "In class",
    intro: "Physically present. Mentally composing a playlist.",
    quotes: [
      "Can you repeat that? I was still writing down the thing before the thing.",
      "Is this going to be on the test, or is it just… knowledge?",
      "I understood it when you did the example. I do not understand it now.",
      "Sorry, I was listening. I just wasn’t hearing.",
      "Can we have class outside today? For focus reasons.",
    ],
  },
  {
    id: "after-the-exam",
    title: "After the exam",
    intro: "The post-exam debrief, also known as collective denial.",
    quotes: [
      "It went fine. I think. I don’t actually remember being there.",
      "Did anyone else write a whole page for the two-mark question?",
      "I’m not discussing it. I’m moving on. …What did you get for question 4?",
      "Honestly, I’d give that paper one star. Would not sit again.",
      "I’ll be fine as long as the marker is in a good mood.",
    ],
  },
  {
    id: "group-chat",
    title: "In the group chat",
    intro: "Where all homework questions go to be left on read.",
    quotes: [
      "Who’s done the homework? Asking for a me.",
      "Wait. There’s homework??",
      "Guys I’ve started!! (I opened the document.)",
      "Not me sending a 3-minute voice note at 1am about the wrong chapter.",
      "Can someone screenshot the question? My brain is on airplane mode.",
    ],
  },
  {
    id: "to-parents",
    title: "To parents",
    intro: "Carefully chosen words, delivered with maximum confidence.",
    quotes: [
      "I’m studying. It’s just on my phone.",
      "Everyone found it hard. Like, everyone.",
      "The teacher said everyone learns at their own pace.",
      "It’s only a mock. Mocks don’t count. Emotionally.",
      "I’m not taking a break. I’m taking a strategic pause.",
    ],
  },
  {
    id: "at-2am",
    title: "At 2am",
    intro: "Peak philosophy hours. Zero revision hours.",
    quotes: [
      "If I learn this whole chapter now, I’m basically ahead.",
      "Maybe I’ll just become famous instead.",
      "Five-minute nap. Alarms set: eleven.",
      "Why does the textbook suddenly make sense? Where was this energy at 2pm?",
      "Sleep is just revision with your eyes closed.",
    ],
  },
];

const situations = [
  {
    emoji: "📞",
    title: "The “quick question” call",
    text: "Starts with one homework question. Ends 47 minutes later with a full review of everyone’s holiday plans and the homework still undone.",
  },
  {
    emoji: "🙋",
    title: "“Any questions?”",
    text: "The whole class has questions. Nobody asks. Everyone asks the person next to them the second the teacher leaves.",
  },
  {
    emoji: "📸",
    title: "The last-paper photo",
    text: "Freedom selfie outside the hall, taken by people who will be stressing about results in roughly four business days.",
  },
];

export default function FunnyStudentQuotesPage() {
  return (
    <ContentShell
      accent="mint"
      eyebrow="Overheard in the corridor"
      title={
        <>
          Funny things <span className="brush">students say</span>
        </>
      }
      intro={
        <>
          Original quotes from the student experience: said out loud, with full confidence and zero evidence. Saving
          the pre-exam ones for later? We wrote <a href={sayings.path}>50 of them</a>.
        </>
      }
      note="(any resemblance to you is purely relatable.)"
      crumbs={[{ name: page.label, path: page.path }]}
      related={[sayings, pages.studentLife, pages.examMemes]}
    >
      {groups.map((group, i) => (
        <Section key={group.id} id={group.id} title={group.title} intro={group.intro} className={cn(i % 2 === 0 && "dots")}>
          <QuoteList quotes={group.quotes} />
        </Section>
      ))}
      <Section id="situations" title="Classic student situations" intro="Not quotes exactly. Just moments everyone has lived through.">
        <ul className="grid gap-6 md:grid-cols-3">
          {situations.map((s, i) => (
            <li
              key={s.title}
              className={cn(
                "note rounded-sm p-6",
                ["bg-sun -rotate-1", "bg-hot rotate-1", "bg-mint -rotate-[0.5deg]"][i],
              )}
            >
              <span className="text-4xl" aria-hidden>
                {s.emoji}
              </span>
              <h3 className="mt-3 font-display text-2xl uppercase leading-tight">{s.title}</h3>
              <p className="mt-2 leading-relaxed">{s.text}</p>
            </li>
          ))}
        </ul>
      </Section>
    </ContentShell>
  );
}

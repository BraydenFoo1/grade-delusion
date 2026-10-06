import type { Metadata } from "next";
import ContentShell from "@/components/content/ContentShell";
import { ArticleBody, Byline, Callout, NumberedList } from "@/components/content/Blocks";
import { PUBLISHED, article, pages } from "@/lib/content";
import { articleJsonLd, pageMetadata } from "@/lib/seo";

const info = article("/blog/funny-things-students-say-before-an-exam");

export const metadata: Metadata = pageMetadata({ ...info, type: "article", publishedTime: PUBLISHED });

const groups = [
  {
    title: "The night before",
    lines: [
      "I’ll just skim the summary. That’s basically the whole chapter.",
      "If I sleep with my notes under my pillow, does that count as revision?",
      "Okay, I’m actually going to sleep early tonight. (Narrator: 3am.)",
      "The teacher said it’s similar to the practice paper. I did not do the practice paper.",
      "I work better under pressure.",
      "I just need to understand the concepts. Memorising is for people with time.",
      "Let me watch one quick video to refresh my memory.",
      "How many marks do I need to pass? Asking for my future.",
      "Honestly, the syllabus is about 80% common sense.",
      "I’ll make a cheat sheet I’m not allowed to bring. For the vibes.",
    ],
  },
  {
    title: "The morning of",
    lines: [
      "I’ll revise on the way there.",
      "My brain feels like a fully charged phone. At 4%.",
      "I’m not nervous. I just haven’t eaten in nine hours.",
      "Okay, I remember everything. Don’t talk to me or it’ll fall out.",
      "Wait. Which exam is today?",
      "I’m bringing three pens and zero knowledge.",
      "If I don’t think about the exam, it can’t hurt me.",
      "Lucky socks: on. Revision: off.",
      "I had a dream about the paper, so technically I’ve seen it.",
      "Coffee, but make it a personality.",
    ],
  },
  {
    title: "Outside the exam hall",
    lines: [
      "Did you study the last chapter? No? Okay, good. Me neither.",
      "Don’t tell me what you revised. It’ll stress me out.",
      "If one more person says “it’s easy” I’m going home.",
      "What’s the formula for… actually, don’t tell me. I want it to be a surprise.",
      "Apparently there’s no essay question this year. (Source: a cousin’s friend.)",
      "Everyone looks so prepared. Is that a ring binder?",
      "I’m mostly here for the attendance.",
      "If it’s multiple choice, I’m going with my heart.",
      "Statistically, someone has to get the top mark. Why not me?",
      "I’m calm. This is my calm face. Why is my hand shaking?",
    ],
  },
  {
    title: "In the hall, before you can start",
    lines: [
      "Deep breaths. Smell of paper. Smell of fear.",
      "I’ll write my name really neatly. Presentation marks.",
      "Is my pen running out? It feels like my pen is running out.",
      "Why is the clock so loud?",
      "This time I’m going to read every question carefully. (Reads one.)",
      "Please let Question 1 be kind.",
      "The person next to me has a calculator that looks smarter than me.",
      "I wonder if the invigilator studied for this.",
      "If I don’t make eye contact with the paper, it can’t sense my fear.",
      "Okay, universe. Now’s your chance.",
    ],
  },
  {
    title: "When the paper finally lands",
    lines: [
      "Oh. Oh no. It’s in English, but I don’t understand it.",
      "Ah, Question 3. My old enemy.",
      "I’ll come back to that one. (Does not come back to that one.)",
      "This wasn’t in the notes. Unless… it was in the notes.",
      "If I write enough, something will be correct.",
      "I know this. I know this. I absolutely, completely do not know this.",
      "The answer is C. I can feel it. There is no option C.",
      "Thank you to my one brain cell for its hard work today.",
      "Showing my working: vibes, hope and a small diagram.",
      "Whatever happens, it’s going in the group chat.",
    ],
  },
];

export default function FunnyThingsStudentsSayPage() {
  let start = 1;
  return (
    <ContentShell
      accent="hot"
      eyebrow="Exams · Blog"
      title={info.title}
      byline={<Byline readMinutes={info.readMinutes} />}
      intro={
        <>
          The 24 hours before an exam produce some of the most confident, least accurate sentences ever spoken. We
          collected 50 of them, in roughly the order they’re said.
        </>
      }
      note="(we have said all of these. some twice.)"
      crumbs={[
        { name: pages.blog.label, path: pages.blog.path },
        { name: info.title, path: info.path },
      ]}
      related={[pages.quotes, pages.examMemes, article("/blog/last-minute-study-guide")]}
      jsonLd={[articleJsonLd({ title: info.title, description: info.description, path: info.path, datePublished: PUBLISHED })]}
    >
      <ArticleBody>
        {groups.map((g) => {
          const first = start;
          start += g.lines.length;
          return (
            <section key={g.title}>
              <h2>{g.title}</h2>
              <NumberedList start={first} items={g.lines.map((l) => `“${l}”`)} />
            </section>
          );
        })}
        <Callout title="Bonus: number 51">
          <p>“Next time I’m starting early.” — Every student, every exam, forever.</p>
        </Callout>
        <p>
          Recognise yourself? You’re in good company. There are more in our collection of{" "}
          <a href={pages.quotes.path}>funny things students say</a>, and the full exam-hall experience lives on the{" "}
          <a href={pages.examMemes.path}>exam memes</a> page.
        </p>
      </ArticleBody>
    </ContentShell>
  );
}

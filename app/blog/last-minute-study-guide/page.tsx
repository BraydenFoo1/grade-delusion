import type { Metadata } from "next";
import ContentShell from "@/components/content/ContentShell";
import { ArticleBody, Byline, Callout, NumberedList } from "@/components/content/Blocks";
import { PUBLISHED, article, pages } from "@/lib/content";
import { articleJsonLd, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

const info = article("/blog/last-minute-study-guide");

export const metadata: Metadata = pageMetadata({
  title: info.seoTitle ?? info.title,
  description: info.description,
  path: info.path,
  type: "article",
  publishedTime: PUBLISHED,
});

const delusionalSteps = [
  {
    title: "Panic, but gently",
    text: "Lie on the floor. Stare at the ceiling. Announce “I’m so cooked” to nobody. This is called warming up.",
  },
  {
    title: "Make a beautiful plan you will not follow",
    text: "Allocate 15 minutes per chapter. There are 14 chapters. It is 11pm. Maths has never been your strongest subject.",
  },
  {
    title: "Assemble the snacks",
    text: "Studying requires fuel. Spend 25 minutes choosing the fuel. You are now 25 minutes behind the plan.",
  },
  {
    title: "Open the textbook and admire it",
    text: "Look at how much knowledge is in there. Feel proud of the knowledge, as if some of it were yours.",
  },
  {
    title: "Watch one “quick summary” video at 2x speed",
    text: "Understand nothing, but faster. Watch the recommended video after it. And the one after that.",
  },
  {
    title: "Highlight everything",
    text: "If everything is important, nothing can surprise you. (Everything will surprise you.)",
  },
  {
    title: "Sleep on the textbook for osmosis",
    text: "Scientists have not proven this works. Scientists have also not been in your situation.",
  },
];

export default function LastMinuteStudyGuidePage() {
  return (
    <ContentShell
      accent="volt"
      eyebrow="Studying · Blog"
      title={info.title}
      byline={<Byline readMinutes={info.readMinutes} />}
      intro={
        <>
          The exam is tomorrow and you’ve just opened the textbook for the first time. Don’t worry: our in-house
          delusional student has a foolproof plan. (Then, at the bottom, someone sensible explains what actually
          works.)
        </>
      }
      note="(skip to the real guide if the exam is in less than 12 hours.)"
      crumbs={[
        { name: pages.blog.label, path: pages.blog.path },
        { name: info.label, path: info.path },
      ]}
      related={[article("/blog/why-students-think-they-have-more-time"), pages.studyMemes, pages.examMemes]}
      jsonLd={[articleJsonLd({ title: info.title, description: info.description, path: info.path, datePublished: PUBLISHED })]}
    >
      <ArticleBody>
        <h2>Part 1: the delusional method</h2>
        <NumberedList
          items={delusionalSteps.map((s) => (
            <>
              <strong>{s.title}.</strong> {s.text}
            </>
          ))}
        />

        <Callout title="Plot twist" tone="bg-hot">
          <p>None of that works. Please don’t do any of that. Here’s the version from someone who isn’t delusional.</p>
        </Callout>

        <h2 id="the-real-guide">Part 2: the guide that actually works</h2>
        <p>If you really are short on time, focus on the few things that make the biggest difference:</p>
        <NumberedList
          items={[
            <>
              <strong>Do questions, don’t reread.</strong> Testing yourself (past papers, practice questions, flashcards)
              helps you remember far more than rereading notes or highlighting.
            </>,
            <>
              <strong>Prioritise.</strong> Check the syllabus or marking scheme and focus on topics that come up often or
              carry the most marks.
            </>,
            <>
              <strong>Close the book and recall.</strong> Write down everything you remember about a topic, then check
              what you missed. The gaps show you exactly what to revise.
            </>,
            <>
              <strong>Work in short, focused blocks.</strong> Try 25 minutes on, 5 minutes off, with your phone in
              another room.
            </>,
            <>
              <strong>Sleep.</strong> Sleep helps your brain hold on to what you learned. An all-nighter usually costs
              more than it gains.
            </>,
            <>
              <strong>Prepare the boring stuff tonight.</strong> Pack your pens, calculator and ID, check the exam time
              and venue, and eat breakfast tomorrow.
            </>,
          ]}
        />
        <p>
          And next time? Start a little earlier, even just ten minutes a day. If you want a proper plan (and someone to
          keep you on track), that’s exactly what{" "}
          <a href={site.gradeSolutionUrl} target="_blank" rel="noopener noreferrer">
            Grade Solution
          </a>{" "}
          is for.
        </p>
        <p>
          Need a laugh before you start? Our <a href={pages.examMemes.path}>exam memes</a> are short enough for a study
          break. Probably.
        </p>
      </ArticleBody>
    </ContentShell>
  );
}

import type { Metadata } from "next";
import ContentShell from "@/components/content/ContentShell";
import { MemeGroups, type MemeGroup } from "@/components/content/Blocks";
import { article, pages } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

const page = pages.examMemes;
const sayings = article("/blog/funny-things-students-say-before-an-exam");

export const metadata: Metadata = pageMetadata(page);

const groups: MemeGroup[] = [
  {
    id: "studied-everything",
    title: "“I studied everything”",
    intro: "Narrator: they did not study everything.",
    memes: [
      { emoji: "🔍", top: "Me: “I studied everything.”", bottom: "The paper: asks about the one diagram I scrolled past." },
      {
        emoji: "📖",
        top: "Covering the whole syllabus:",
        bottom: "Read all the chapter titles. Felt something. Called it revision.",
      },
    ],
  },
  {
    id: "exam-confidence",
    title: "Exam confidence",
    intro: "Confidence level: 100%. Evidence level: still loading.",
    memes: [
      { emoji: "💪", top: "My pre-exam pep talk:", bottom: "“You’ve got this.” (You have, at most, part of this.)" },
      {
        emoji: "⏱️",
        top: "Finishing the paper 40 minutes early:",
        bottom: "Either a genius or forgot to turn over the last page. No in-between.",
      },
    ],
  },
  {
    id: "opening-the-paper",
    title: "Opening the paper",
    intro: "The exact moment every fact you learned packs its bags and leaves.",
    memes: [
      { emoji: "🧳", top: "Turning over the exam paper:", bottom: "Every fact I knew, walking out of the hall without me." },
      { emoji: "😐", top: "Reading Question 1:", bottom: "Who wrote this? And why does it feel personal?" },
    ],
  },
  {
    id: "answer-key",
    title: "Checking the answer key",
    intro: "Comparing answers outside the hall: a sport with no winners.",
    memes: [
      { emoji: "🥔", top: "Everyone outside the hall: “It was C.”", bottom: "Me, who wrote “potato”: “Yeah… C.”" },
      {
        emoji: "👵",
        top: "Marking my own practice paper:",
        bottom: "With the generosity of a grandparent at Chinese New Year.",
      },
    ],
  },
  {
    id: "results-day",
    title: "Results day",
    intro: "The day the delusion gets… recalibrated.",
    memes: [
      { emoji: "✈️", top: "Results day morning:", bottom: "Suddenly very interested in moving overseas." },
      { emoji: "📉", top: "Opening my results:", bottom: "Okay. So we’re calling this a “learning experience” now." },
    ],
  },
  {
    id: "last-minute-revision",
    title: "Last-minute revision",
    intro: (
      <>
        Speed-reading a textbook outside the hall like it’s the terms and conditions. (If that’s you, the{" "}
        <a href="/blog/last-minute-study-guide">last-minute study guide</a> has a real version at the bottom.)
      </>
    ),
    memes: [
      { emoji: "🏃", top: "10 minutes before the exam:", bottom: "Trying to learn the whole textbook through vibes alone." },
      { emoji: "😱", top: "Friend outside the hall: “Did you revise topic 7?”", bottom: "There’s a topic 7??" },
    ],
  },
];

export default function ExamMemesPage() {
  return (
    <ContentShell
      accent="hot"
      eyebrow="Exam season edition"
      title={
        <>
          Funny exam memes &amp; <span className="brush">exam delusions</span>
        </>
      }
      intro={
        <>
          For everyone who walked in confident, opened the paper, and immediately forgot their own name. Rate your
          damage with the <a href={pages.examDelusions.path}>10 levels of exam delusion</a>, or read the{" "}
          <a href={sayings.path}>50 things students say before an exam</a>.
        </>
      }
      note="(this page is not on the syllabus. probably.)"
      crumbs={[{ name: page.label, path: page.path }]}
      related={[pages.examDelusions, sayings, pages.quotes]}
    >
      <MemeGroups groups={groups} />
    </ContentShell>
  );
}

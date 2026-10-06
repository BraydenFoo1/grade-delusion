// Single source of truth for the content pages and blog articles.
// The sitemap, internal links, homepage "Explore" section, footer and mobile menu all read from here,
// so every URL stays identical to its canonical.

export type ContentLink = { path: string; label: string; emoji: string; blurb: string };
export type ContentPage = ContentLink & { title: string; description: string };

export const pages = {
  studentMemes: {
    path: "/student-memes",
    label: "Student Memes",
    emoji: "🧠",
    blurb: "Procrastination, group projects and deadlines, lovingly memed.",
    title: "Student Memes & Academic Delusions",
    description:
      "Relatable student memes about procrastination, exams, studying, assignments, group projects, deadlines and results. 100% confidence, 0% evidence.",
  },
  examMemes: {
    path: "/exam-memes",
    label: "Exam Memes",
    emoji: "📝",
    blurb: "For everyone who “studied everything”.",
    title: "Funny Exam Memes & Exam Delusions",
    description:
      "Funny exam memes for anyone who “studied everything”, forgot it all when the paper opened, and checked the answer key with far too much hope.",
  },
  studyMemes: {
    path: "/study-memes",
    label: "Study Memes",
    emoji: "📚",
    blurb: "Colour-coded timetables. Zero studying.",
    title: "Funny Study Memes & Study Delusions",
    description:
      "Funny study memes about fake productivity, colour-coded schedules, rewriting notes instead of revising, 2am cramming and “I’ll start tomorrow”.",
  },
  examDelusions: {
    path: "/exam-delusions",
    label: "Exam Delusions",
    emoji: "🔮",
    blurb: "The 10 levels, from mildly hopeful to EXTREME.",
    title: "The 10 Levels of Exam Delusion",
    description:
      "From mildly hopeful to EXTREME DELUSION: the 10 levels of exam confidence every student goes through. Find out which level you’re on right now.",
  },
  quotes: {
    path: "/funny-student-quotes",
    label: "Funny Student Quotes",
    emoji: "💬",
    blurb: "Things students say. Out loud. With confidence.",
    title: "Funny Things Students Say",
    description:
      "Original funny things students say in class, after exams, in the group chat, to their parents and at 2am. Relatable quotes, zero academic evidence.",
  },
  studentLife: {
    path: "/student-life",
    label: "Student Life",
    emoji: "🎒",
    blurb: "Snoozed alarms, canteen queues and results season.",
    title: "Student Life: The Chaos, Memes & Delusions",
    description:
      "Student life in all its chaos: snoozed alarms, canteen queues, CCA, tuition, group projects, weekends and results season. Memes and delusions included.",
  },
  blog: {
    path: "/blog",
    label: "Blog",
    emoji: "✏️",
    blurb: "Long-form delusion. Very scientific (not).",
    title: "Blog: Student Humour & Exam Chaos",
    description:
      "The Grade Delusion blog: funny articles about exams, studying, procrastination and student life, written by every student’s inner delusional voice.",
  },
} satisfies Record<string, ContentPage>;

/** The six discovery pages (plus the blog) shown on the homepage, footer and mobile menu. */
export const exploreLinks: ContentLink[] = [
  pages.studentMemes,
  pages.examMemes,
  pages.studyMemes,
  pages.examDelusions,
  pages.studentLife,
  pages.quotes,
];

export const PUBLISHED = "2026-10-06";
export const PUBLISHED_LABEL = "6 October 2026";

export type Article = ContentLink & {
  title: string;
  /** Shorter title for search results when the full headline is too long. */
  seoTitle?: string;
  description: string;
  tag: string;
  readMinutes: number;
};

export const articles: Article[] = [
  {
    path: "/blog/funny-things-students-say-before-an-exam",
    label: "50 Funny Things Students Say Before an Exam",
    title: "50 Funny Things Students Say Before an Exam",
    emoji: "🗣️",
    tag: "Exams",
    readMinutes: 4,
    blurb: "From “I’ll revise on the way there” to “there is no option C”.",
    description:
      "From “I’ll revise on the way there” to “the answer is C, I can feel it”: 50 funny things students say the night before and the morning of an exam.",
  },
  {
    path: "/blog/signs-youre-academically-delusional",
    label: "20 Signs You’re Academically Delusional",
    title: "20 Signs You’re Academically Delusional",
    emoji: "🚩",
    tag: "Delusion",
    readMinutes: 4,
    blurb: "Highlighting counts as studying, right? Right?",
    description:
      "Think highlighting counts as studying? Here are 20 signs you’re academically delusional, from five-colour timetables to predicting the whole paper.",
  },
  {
    // Lives at a top-level URL (it's also a discovery page), so there's only ever one copy of it.
    path: pages.examDelusions.path,
    label: pages.examDelusions.title,
    title: pages.examDelusions.title,
    emoji: pages.examDelusions.emoji,
    tag: "Exams",
    readMinutes: 4,
    blurb: "A scientific* ladder from “I’ll be fine” to “bubble tea after I finish early”.",
    description: pages.examDelusions.description,
  },
  {
    path: "/blog/why-students-think-they-have-more-time",
    label: "Why Students Always Think They Have More Time",
    title: "Why Students Always Think They Have More Time",
    emoji: "⏳",
    tag: "Procrastination",
    readMinutes: 4,
    blurb: "The surprisingly real science behind “I’ve got ages”.",
    description:
      "Why does “I’ve got loads of time” always turn into “it’s due tonight”? A funny (and slightly scientific) look at why students underestimate time.",
  },
  {
    path: "/blog/last-minute-study-guide",
    label: "The Ultimate Last-Minute Study Guide",
    title: "The Ultimate Last-Minute Study Guide (According to a Delusional Student)",
    seoTitle: "The Ultimate Last-Minute Study Guide (Delusional Edition)",
    emoji: "🚨",
    tag: "Studying",
    readMinutes: 5,
    blurb: "Step 1: panic. Step 2: read the real guide at the bottom.",
    description:
      "A satirical last-minute study guide from a delusional student, followed by the real version: active recall, past papers and actually getting some sleep.",
  },
];

export const article = (path: string) => {
  const found = articles.find((a) => a.path === path);
  if (!found) throw new Error(`Unknown article: ${path}`);
  return found;
};

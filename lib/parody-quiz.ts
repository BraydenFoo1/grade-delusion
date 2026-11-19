// Grade Delusion "Student Edition" parody quiz. Original questions, original scoring: comedy, not an assessment.
// Pure data and functions only; answers and results are never stored or sent anywhere.

import { homeUrl } from "./site";

export const EDITION_LABEL = "Student Edition";
export const QUIZ_TITLE = "What's Really Holding Back Your Marks?";
export const DISCLAIMER = "Comedy and entertainment only. Not a real academic assessment.";

export type CategoryId = "tys" | "procrastination" | "highlighters" | "phone" | "revision" | "excuses" | "spotting";

export type Question = {
  id: CategoryId;
  /** Multiplier for this question's points. */
  weight: number;
  q: string;
  /** Four options, in order of rising delusion: option index === points (0 to 3). */
  options: readonly [string, string, string, string];
};

export const QUESTIONS: readonly Question[] = [
  {
    id: "tys",
    weight: 2,
    q: "Your Ten-Year Series (TYS) is currently…",
    options: [
      "Done, marked, and corrected in red pen",
      "Half done. The other half is “for later”.",
      "Bought. Never opened. Still smells new.",
      "Holding up my laptop as a stand",
    ],
  },
  {
    id: "procrastination",
    weight: 2,
    q: "It’s Sunday night. Prelims start in 6 days. Your plan:",
    options: [
      "Follow the timetable I made in Week 1",
      "Make a new timetable. Colour-coded. Laminated.",
      "Start properly after Monday. Monday feels fresh.",
      "I work best under pressure. (In my head I’m Einstein.)",
    ],
  },
  {
    id: "highlighters",
    weight: 1,
    q: "How many highlighters do you own?",
    options: [
      "One, and it still has ink",
      "A neat set of five",
      "Full rainbow plus pastels, “for different topics”",
      "I stopped counting. The textbook is now 90% yellow.",
    ],
  },
  {
    id: "phone",
    weight: 2,
    q: "You pick up your phone to “just check one notification”. Then?",
    options: [
      "It’s in another room. Mum has the key.",
      "I check it, then I’m back in a minute",
      "Forty minutes of Reels. One “study with me” video watched, which counts.",
      "Opened it to check a formula. Woke up at 2 AM on volcano facts.",
    ],
  },
  {
    id: "revision",
    weight: 2,
    q: "The night before the paper, you…",
    options: [
      "Sleep early. The revision is already done.",
      "Skim the notes, then sleep",
      "Cram till 3 AM on chapters I never opened",
      "Set a 5 AM alarm to study. Snoozed it six times.",
    ],
  },
  {
    id: "excuses",
    weight: 1,
    q: "You walk out of the exam hall. First thought:",
    options: [
      "A few careless mistakes. I’ll check which ones.",
      "Paper 2 was harder than expected, fair enough",
      "They tested things nobody ever taught us. Obviously.",
      "My brain lagged. It’s a system issue, not a me issue.",
    ],
  },
  {
    id: "spotting",
    weight: 1,
    q: "Your cher says “this topic won’t come out”. You…",
    options: [
      "Study it anyway",
      "Skim it, just in case",
      "Skip it, pray, then cry when it appears",
      "Build my whole strategy around cher’s vibes",
    ],
  },
];

export const QUESTION_COUNT = QUESTIONS.length;
export const MAX_SCORE = QUESTIONS.reduce((sum, q) => sum + 3 * q.weight, 0);

export type Answers = readonly number[];

export function isCompleteAnswers(answers: Answers): boolean {
  return (
    answers.length === QUESTIONS.length &&
    answers.every((a) => Number.isInteger(a) && a >= 0 && a < 4)
  );
}

function assertComplete(answers: Answers) {
  if (!isCompleteAnswers(answers)) throw new RangeError("Expected one answer (0 to 3) for each of the 7 questions.");
}

export function scoreAnswers(answers: Answers): { score: number; max: number; pct: number } {
  assertComplete(answers);
  const score = answers.reduce((sum, a, i) => sum + a * QUESTIONS[i].weight, 0);
  return { score, max: MAX_SCORE, pct: Math.round((score / MAX_SCORE) * 100) };
}

export type Rank = { min: number; title: string; line: string };

/** Ascending by `min`. The top rank starts at 92%. */
export const RANKS: readonly Rank[] = [
  { min: 0, title: "Level 1 Suspiciously Prepared Human", line: "Your honesty is alarming. Please report to a cher for a wellness check." },
  { min: 20, title: "Level 24 Part-Time Planner", line: "You have a plan. You will follow about 40% of it, and be very proud." },
  { min: 40, title: "Level 47 Last-Minute Merchant", line: "Your best work happens at 3 AM, shortly before your worst work." },
  { min: 60, title: "Level 66 Highlighter Hoarder", line: "Your confidence has outrun your revision and is not looking back." },
  { min: 80, title: "Level 88 Chief Cramming Officer", line: "The syllabus is a rumour you plan to fact-check on exam day." },
  { min: 92, title: "Level 99 Grandmaster Procrastinator", line: "Legendary. You could delay the apocalypse and still blame the traffic." },
];

export function rankFor(pct: number): Rank {
  const p = Number.isFinite(pct) ? pct : 0;
  return [...RANKS].reverse().find((r) => p >= r.min) ?? RANKS[0];
}

const CATEGORY_LINES: Record<CategoryId, string> = {
  tys: "Biggest red flag: your TYS has been “bought for the aesthetic”.",
  procrastination: "Biggest red flag: “I’ll start tomorrow” is basically your personality.",
  highlighters: "Biggest red flag: highlighting is not studying, and your textbook is now neon.",
  phone: "Biggest red flag: your phone has a better attendance record than you.",
  revision: "Biggest red flag: the 5 AM alarm is a work of fiction.",
  excuses: "Biggest red flag: the exam hall wasn’t the problem, but you’ve already drafted the excuse.",
  spotting: "Biggest red flag: your entire syllabus is cher’s mood.",
};

const NO_FLAG_LINE = "No red flags found. Are you sure you’re a student?";

/** Fixed tie-break order: the first category among equals wins. */
const CATEGORY_ORDER: readonly CategoryId[] = QUESTIONS.map((q) => q.id);

/**
 * The category with the highest raw answer (0 to 3). Ties go to the earlier question; if every answer is 0 there is
 * no dominant category (null).
 */
export function dominantCategory(answers: Answers): CategoryId | null {
  assertComplete(answers);
  let best: CategoryId | null = null;
  let bestPoints = 0;
  for (const id of CATEGORY_ORDER) {
    const points = answers[CATEGORY_ORDER.indexOf(id)];
    if (points > bestPoints) {
      best = id;
      bestPoints = points;
    }
  }
  return best;
}

export type QuizResult = {
  pct: number;
  rank: string;
  diagnosis: string;
  category: CategoryId | null;
};

/** The whole result for a full set of answers. Deterministic: the same answers always give the same text. */
export function resultFor(answers: Answers): QuizResult {
  const { pct } = scoreAnswers(answers);
  const rank = rankFor(pct);
  const category = dominantCategory(answers);
  const flag = category ? CATEGORY_LINES[category] : NO_FLAG_LINE;
  return { pct, rank: rank.title, diagnosis: `${rank.line} ${flag}`, category };
}

export function shareText(result: Pick<QuizResult, "pct" | "rank">): string {
  return `My Delusion Level is ${result.pct}%: ${result.rank}. How delusional are you? Grade Delusion™ Student Edition ${homeUrl}`;
}

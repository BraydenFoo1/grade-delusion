// Logic for the three mini-toys. Pure; randomness is injectable so tests are deterministic.

// ---- Toy A: TYS Dust-O-Meter ------------------------------------------------------------------------------

export const TYS_MAX_PAGES = 1500;
export const TYS_STEP = 10;

export type DustResult = {
  bought: number;
  done: number;
  /** Share of bought pages actually done, 0 to 100. */
  completionPct: number;
  /** Academic Delusion Score, 0 to 100. */
  score: number;
  /** Estimated dust on the unopened pages, in millimetres. */
  dustMm: number;
  title: string;
  roast: string;
};

const clampPages = (n: number) => (Number.isFinite(n) ? Math.min(TYS_MAX_PAGES, Math.max(0, Math.round(n))) : 0);

const DUST_TIERS: readonly { min: number; title: string; roast: string }[] = [
  { min: 0, title: "Weirdly Productive", roast: "You actually use your TYS. Are you okay? Do you need a hug, or a hobby?" },
  { min: 15, title: "Dust-Free (Mostly)", roast: "A healthy relationship with paper. The other half of the book is just resting." },
  { min: 35, title: "Light Dusting", roast: "You have the book. The book has you. Neither of you has opened Chapter 5." },
  { min: 60, title: "Archaeological Site", roast: "Future historians will find your TYS and ask who it was bought for." },
  { min: 85, title: "Certified Dust Farmer", roast: "Your TYS is now a decorative item. It really does tie the desk together." },
];

/**
 * Academic Delusion Score: the share of bought pages left undone, scaled by how many pages were bought
 * (more pages bought = more room to be delusional). 0 pages bought means nothing to dust, so the score is 0.
 */
export function dustOMeter(boughtPages: number, donePages: number): DustResult {
  const bought = clampPages(boughtPages);
  const done = Math.min(clampPages(donePages), bought);
  if (bought === 0) {
    return {
      bought,
      done,
      completionPct: 0,
      score: 0,
      dustMm: 0,
      title: "Nothing Bought",
      roast: "No TYS, no dust. Bold strategy. Please confirm you have a plan.",
    };
  }
  const completion = done / bought;
  const score = Math.round((1 - completion) * (60 + 40 * (Math.min(bought, 800) / 800)));
  const tier = [...DUST_TIERS].reverse().find((t) => score >= t.min) ?? DUST_TIERS[0];
  return {
    bought,
    done,
    completionPct: Math.round(completion * 100),
    score,
    dustMm: Math.round((bought - done) / 50),
    title: tier.title,
    roast: tier.roast,
  };
}

// ---- Toy B: Certificate of Delusion -----------------------------------------------------------------------

export type Excuse = { id: string; text: string };

export const EXCUSES: readonly Excuse[] = [
  { id: "lag", text: "My brain lagged during Paper 2" },
  { id: "wrong-topic", text: "I revised the wrong topic" },
  { id: "untaught", text: "The paper tested things nobody taught us" },
  { id: "pencil", text: "My pencil was emotionally unavailable" },
  { id: "airplane", text: "My brain was on airplane mode" },
  { id: "mock", text: "I peaked during the mock exam" },
  { id: "clock", text: "The clock was running too fast" },
  { id: "shoes", text: "The invigilator’s shoes were too loud" },
  { id: "saving", text: "I was saving my best answers for the next paper" },
];

export function excuseById(id: string): Excuse {
  return EXCUSES.find((e) => e.id === id) ?? EXCUSES[0];
}

/** "16 November 2026", always English, independent of the visitor's locale. */
export function formatIssueDate(d: Date): string {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ---- Toy C: "Will It Come Out?" Exam Magic 8-Ball ----------------------------------------------------------

export const EIGHT_BALL_ANSWERS: readonly string[] = [
  "Confirm plus chop coming out.",
  "Ask your cher, don’t ask me.",
  "Start praying now.",
  "Cannot lah, too obvious to come out.",
  "50-50. Same as your revision.",
  "Don’t play play, memorise it anyway.",
  "Sure ah? Last year also you said that.",
  "It’ll come out, in a form you’ve never seen before.",
  "Bo pian, just study the whole syllabus lor.",
  "Highly unlikely, but highlight it for peace of mind.",
  "Cher says no, but cher’s eyes say yes.",
  "Definitely coming out. Mostly in your nightmares.",
  "Reply hazy. Try studying again.",
  "Don’t chiong the last chapter. Go sleep.",
  "Signs point to Paper 2. Good luck, my friend.",
  "Yes, but only the one part you skipped.",
];

/** A random answer index that differs from `previous` whenever there is more than one answer. */
export function nextAnswerIndex(previous: number | null, rng: () => number = Math.random): number {
  const n = EIGHT_BALL_ANSWERS.length;
  const roll = (r: number) => Math.min(n - 1, Math.max(0, Math.floor(r * n)));
  let i = roll(rng());
  if (previous !== null && i === previous) i = (i + 1 + roll(rng()) % (n - 1)) % n;
  return i;
}

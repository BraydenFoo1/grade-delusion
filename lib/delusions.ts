// Content and logic for the Delusion-O-Matic (components/DelusionGenerator.tsx).
// Everything is local and curated: no network, no storage.

/** The original 18 Delusion-O-Matic lines, kept verbatim. */
export const CLASSIC_DELUSIONS = [
  "I only need to study the night before.",
  "The teacher definitely won't test this.",
  "I can finish the entire syllabus tonight.",
  "I'll remember this without writing it down.",
  "I definitely got at least 80%.",
  "The exam looked easier than expected.",
  "I'll start studying tomorrow.",
  "Five more minutes of TikTok, then I'll lock in.",
  "I understood the lesson, so I don't need to practise.",
  "If I sleep with the textbook under my pillow, it counts.",
  "Everyone else didn't study either. Teacher cannot scold the class for sure. Confirm+Chop",
  "Rewriting my notes in nice colours is basically studying.",
  "I don't need the formula sheet. I AM the formula sheet.",
  "I'll just revise during lunch before the exam.",
  "One 10-minute YouTube video = chapter mastered.",
  "My handwriting is so neat the examiner will give bonus marks.",
  "Making a study timetable is the hardest part. Done. Basically finished.",
  "I'll study on the bus. (I will be asleep on the bus.)",
] as const;

export type ScenarioId =
  | "surprise"
  | "exam-tomorrow"
  | "not-studied"
  | "teacher-easy"
  | "midnight-deadline"
  | "group-project"
  | "results-day"
  | "late-night";

export type Scenario = { id: ScenarioId; emoji: string; label: string; lines: readonly string[] };

const SPECIFIC: Scenario[] = [
  {
    id: "exam-tomorrow",
    emoji: "📅",
    label: "My exam is tomorrow",
    lines: [
      "If I read the summary twice, it counts as reading the chapter twice.",
      "Eight hours of sleep or eight hours of cramming? Why not neither.",
      "I'll learn the whole syllabus tonight. I've seen a montage, I know how this works.",
      "The exam is tomorrow, which technically means I have all of today.",
      "Last-minute revision is just revision with better focus.",
      "My brain is a sponge. A slightly dry sponge, but a sponge.",
      "Tomorrow-me is going to be so prepared. Tonight-me is just setting the vibe.",
    ],
  },
  {
    id: "not-studied",
    emoji: "🙈",
    label: "I haven't studied",
    lines: [
      "I've absorbed the syllabus through the group chat. Basically osmosis.",
      "I didn't study, but I watched someone else study. That's teamwork.",
      "Not studying is a strategy. The examiner won't see it coming.",
      "I'll just use logic. Logic has never let me down. (Logic has always let me down.)",
      "Everything I need to know is already in my heart.",
      "I was present in class. Spiritually, at least.",
      "If I didn't study, the exam can't be harder than my expectations.",
    ],
  },
  {
    id: "teacher-easy",
    emoji: "😇",
    label: "The teacher said it's easy",
    lines: [
      "If the teacher thinks it's easy, imagine how easy it is for me.",
      "“Easy” means I can skip the hard chapters. That's just reading comprehension.",
      "The teacher called it easy, so studying would honestly be disrespectful.",
      "Easy paper, easy A. I'm basically doing the teacher a favour by turning up.",
      "The teacher smiled when they said it. That's a guaranteed full-marks smile.",
      "Easy for the teacher means easy for me. We're basically the same person.",
    ],
  },
  {
    id: "midnight-deadline",
    emoji: "⏰",
    label: "Assignment due at midnight",
    lines: [
      "11:58pm is plenty of time. Deadlines are a vibe, not a rule.",
      "I work best when the deadline can see me.",
      "I'll write 1,500 words in an hour. That's only 25 words a minute. Easy.",
      "The upload bar will be fast tonight. I can feel it.",
      "Starting now is basically starting early, if you think about it.",
      "My first draft is my final draft. I call it efficiency.",
      "If the portal crashes at 11:59pm, that's an extension from the universe.",
    ],
  },
  {
    id: "group-project",
    emoji: "👥",
    label: "Group project, zero progress",
    lines: [
      "We're not behind. We're building suspense.",
      "Someone in the group will do it. Statistically, it might even be me.",
      "We have a group chat. That's 80% of a group project.",
      "The slides will make themselves once we agree on the font.",
      "We'll split the work evenly: one person does it and three people present it.",
      "Zero progress just means maximum potential.",
      "We'll finish the whole thing on the bus to school. Teamwork!",
    ],
  },
  {
    id: "results-day",
    emoji: "📊",
    label: "Results come out today",
    lines: [
      "If I don't open the portal, the grade can't hurt me.",
      "I definitely did better than I think. And I think I did amazing.",
      "The bell curve has always believed in me.",
      "Whatever the result is, the marker clearly didn't understand my genius.",
      "I've already planned my celebration. The results are just paperwork.",
      "Refreshing every ten seconds definitely makes the results come out faster.",
      "My expected grade is an A. My emotional grade is also an A.",
    ],
  },
  {
    id: "late-night",
    emoji: "🌙",
    label: "It's 2am and I'm “revising”",
    lines: [
      "My brain works best when my body is asleep.",
      "2am is when the real learning happens. And the snacking.",
      "Watching one more video about how to study counts as studying.",
      "I'll sleep at 3, wake at 6, and be completely fine. Science says so (it does not).",
      "Re-colouring my notes at 2am is a crucial part of the process.",
      "If I'm still awake, I'm technically still revising.",
      "One more episode and then I'll become a completely different person.",
    ],
  },
];

/** "Surprise me" draws from the classic lines plus every scenario. */
export const SCENARIOS: Scenario[] = [
  {
    id: "surprise",
    emoji: "🎲",
    label: "Surprise me",
    lines: [...new Set([...CLASSIC_DELUSIONS, ...SPECIFIC.flatMap((s) => s.lines)])],
  },
  ...SPECIFIC,
];

export const DEFAULT_SCENARIO: ScenarioId = "surprise";

export function scenarioById(id: ScenarioId): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Returns a draw function that shows every line once before repeating,
 *  and never repeats the previous line across a refill. */
export function createLineBag(lines: readonly string[], random: () => number = Math.random) {
  let queue: string[] = [];
  let previous: string | undefined;
  return () => {
    if (queue.length === 0) {
      queue = shuffle(lines, random);
      if (queue.length > 1 && queue[0] === previous) queue.push(queue.shift()!);
    }
    previous = queue.shift()!;
    return previous;
  };
}

// Deliberately absurd, in the spirit of "100% confidence. 0% evidence."
export const CONFIDENCE_MIN = 112;
export const CONFIDENCE_MAX = 420;

export function rollConfidence(random: () => number = Math.random) {
  return CONFIDENCE_MIN + Math.floor(random() * (CONFIDENCE_MAX - CONFIDENCE_MIN + 1));
}

export function severity(confidence: number) {
  if (confidence >= 330) return "Legendary";
  if (confidence >= 200) return "Extreme";
  return "Severe";
}

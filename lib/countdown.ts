// Countdown maths and the "Current Delusion Status" lines. Pure: no DOM, no clock of its own.

import { verifiedTarget, type ExamConfig, type ExamId } from "./exam-dates";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const UNANNOUNCED_HEADLINE = "2027 Exam Dates Not Announced Yet";

export type TimeLeft = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  over: boolean;
};

/** Time between `now` and `target` (both epoch ms or Date). Never negative: past targets give zeros and `over`. */
export function timeLeft(target: Date | number, now: Date | number): TimeLeft {
  const diff = (typeof target === "number" ? target : target.getTime()) - (typeof now === "number" ? now : now.getTime());
  const totalMs = Number.isFinite(diff) ? Math.max(0, diff) : 0;
  return {
    totalMs,
    days: Math.floor(totalMs / DAY),
    hours: Math.floor((totalMs % DAY) / HOUR),
    minutes: Math.floor((totalMs % HOUR) / MINUTE),
    seconds: Math.floor((totalMs % MINUTE) / SECOND),
    over: !(diff > 0),
  };
}

/** Delusion status for a live countdown, by whole days remaining. */
export function statusFor(daysLeft: number): string {
  if (daysLeft > 100) return "Plenty of time, relax bro";
  if (daysLeft > 60) return "Still early. Future You will handle it. Future You is very capable.";
  if (daysLeft >= 30) return "Time to start planning to plan. A new pencil case counts as progress.";
  if (daysLeft >= 3) return "Time to highlight the entire textbook";
  return "If I sleep 8 hours, osmosis will transfer the notes into my brain";
}

export const OVER_STATUS = "The exam has started or ended. Whatever happened, happened. Results day is a Future You problem.";

/** Delusion status while a date is not announced. Generic on purpose: no claim about timing. */
const UNANNOUNCED_STATUS: Record<ExamId, string> = {
  psle: "No date yet. Perfect time to plan. Starting tomorrow.",
  sec: "A brand-new exam with no date yet. The panic is also brand new.",
  "a-level": "Date pending. Procrastination remains right on schedule.",
};

export function unannouncedStatus(id: ExamId): string {
  return UNANNOUNCED_STATUS[id];
}

export type CountdownState =
  | { kind: "unannounced"; status: string }
  | { kind: "live"; time: TimeLeft; status: string; target: Date; describes: string }
  | { kind: "over"; status: string; target: Date; describes: string };

/** What a tab should show. The countdown runs only for a verified official date. */
export function countdownState(exam: ExamConfig, now: Date | number): CountdownState {
  const target = verifiedTarget(exam);
  if (!target || !exam.official) return { kind: "unannounced", status: unannouncedStatus(exam.id) };
  const time = timeLeft(target, now);
  if (time.over) return { kind: "over", status: OVER_STATUS, target, describes: exam.official.describes };
  return { kind: "live", time, status: statusFor(time.days), target, describes: exam.official.describes };
}

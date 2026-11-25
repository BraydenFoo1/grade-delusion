// ONE place to configure the exam countdown. The UI never needs editing.
//
// HOW TO ADD A DATE
//   Set `official` on the exam below, but ONLY once SEAB or MOE has officially published it.
//   (The date, URL and wording in the example below are FICTIONAL, for illustration only. They are not real dates.)
//     official: {
//       iso: "2027-09-24T08:00:00+08:00",              // FICTIONAL EXAMPLE date, NOT an official examination date. Singapore time, WITH an explicit offset
//       describes: "First written paper",              // what the countdown is counting down to
//       sourceUrl: "https://www.seab.gov.sg/...",      // the official SEAB / MOE page that publishes it
//       verifiedOn: "2026-12-01",                      // the day you checked that page (YYYY-MM-DD)
//     },
//   Until a date is added (and valid), the countdown shows "2027 Exam Dates Not Announced Yet" and never a
//   number. A date missing its source, verification day, an explicit offset, or hosted anywhere other than
//   seab.gov.sg / moe.gov.sg is ignored, and a unit test fails if the shipped config contains one.
//
// DO NOT put estimates, last year's dates or third-party dates here.
//
// Status at the time of writing (checked 2026-11-16): SEAB and MOE had not published 2027 PSLE, SEC or
// A-Level examination dates. SEAB only gives month ranges for SEC (English/Mother Tongue in September, other
// written papers October to November). The separate N- and O-Level exams are replaced by the SEC from 2027.

export const EXAM_YEAR = 2027;

export type ExamId = "psle" | "sec" | "a-level";

export type OfficialDate = {
  /** ISO 8601 timestamp with an explicit offset (the shape only: "2027-09-24T08:00:00+08:00" is a fictional example, not an official date). */
  iso: string;
  /** What the countdown counts down to, e.g. "First written paper". */
  describes: string;
  /** Official SEAB / MOE page that publishes this date. */
  sourceUrl: string;
  /** Day the date was checked against that page, YYYY-MM-DD. */
  verifiedOn: string;
};

export type ExamConfig = {
  id: ExamId;
  label: string;
  subtitle: string;
  official: OfficialDate | null;
};

export const EXAMS_2027: readonly ExamConfig[] = [
  {
    id: "psle",
    label: "PSLE",
    subtitle: "Primary School Leaving Examination",
    official: null,
  },
  {
    id: "sec",
    label: "SEC",
    subtitle: "Singapore-Cambridge Secondary Education Certificate (replaces N- and O-Level from 2027)",
    official: null,
  },
  {
    id: "a-level",
    label: "A-Level",
    subtitle: "GCE Advanced Level",
    official: null,
  },
];

const OFFICIAL_HOSTS = ["seab.gov.sg", "moe.gov.sg"];

export function isOfficialSource(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return OFFICIAL_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The countdown target, or null when the exam has no VERIFIED official date. Every condition must hold:
 * a parseable ISO timestamp with an explicit offset, an official https source on seab.gov.sg / moe.gov.sg,
 * a verification day, and a description.
 */
export function verifiedTarget(exam: Pick<ExamConfig, "official">): Date | null {
  const o = exam.official;
  if (!o) return null;
  if (!ISO_WITH_OFFSET.test(o.iso)) return null;
  if (!DAY.test(o.verifiedOn) || Number.isNaN(Date.parse(o.verifiedOn))) return null;
  if (!isOfficialSource(o.sourceUrl)) return null;
  if (!o.describes.trim()) return null;
  const t = Date.parse(o.iso);
  return Number.isNaN(t) ? null : new Date(t);
}

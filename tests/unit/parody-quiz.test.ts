import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DISCLAIMER,
  EDITION_LABEL,
  MAX_SCORE,
  QUESTIONS,
  RANKS,
  dominantCategory,
  isCompleteAnswers,
  rankFor,
  resultFor,
  scoreAnswers,
  shareText,
} from "@/lib/parody-quiz";
import { site } from "@/lib/site";

const all = (n: number) => Array(QUESTIONS.length).fill(n) as number[];

describe("quiz content", () => {
  it("is labelled Student Edition, as comedy", () => {
    expect(EDITION_LABEL).toBe("Student Edition");
    expect(DISCLAIMER).toMatch(/not a real academic assessment/i);
  });
  it("has exactly 7 questions with 4 distinct options each", () => {
    expect(QUESTIONS).toHaveLength(7);
    for (const q of QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.q.length).toBeGreaterThan(10);
    }
    expect(new Set(QUESTIONS.map((q) => q.q)).size).toBe(7);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(7);
  });
  it("covers the required topics", () => {
    const ids = QUESTIONS.map((q) => q.id);
    for (const topic of ["tys", "procrastination", "highlighters", "phone", "revision", "excuses"]) expect(ids).toContain(topic);
    const text = JSON.stringify(QUESTIONS).toLowerCase();
    for (const word of ["tys", "highlighter", "phone", "5 am"]) expect(text).toContain(word);
  });
  it("ranks ascend from 0 and the top one is the Grandmaster", () => {
    expect(RANKS[0].min).toBe(0);
    for (let i = 1; i < RANKS.length; i++) expect(RANKS[i].min).toBeGreaterThan(RANKS[i - 1].min);
    expect(RANKS.at(-1)!.title).toBe("Level 99 Grandmaster Procrastinator");
  });
});

describe("scoring", () => {
  it("min and max answers give 0% and 100%", () => {
    expect(scoreAnswers(all(0)).pct).toBe(0);
    expect(scoreAnswers(all(3))).toMatchObject({ pct: 100, score: MAX_SCORE });
  });
  it("rejects incomplete or out-of-range answers", () => {
    expect(isCompleteAnswers([0, 1])).toBe(false);
    expect(isCompleteAnswers([...all(0), 0])).toBe(false);
    expect(isCompleteAnswers(all(4))).toBe(false);
    expect(isCompleteAnswers(all(-1))).toBe(false);
    expect(isCompleteAnswers([...all(0).slice(1), 1.5])).toBe(false);
    expect(() => scoreAnswers([0])).toThrow(RangeError);
    expect(() => resultFor(all(9))).toThrow(RangeError);
  });
  it("rankFor picks the tier at each boundary and is safe on odd input", () => {
    for (const r of RANKS) expect(rankFor(r.min).title).toBe(r.title);
    expect(rankFor(100).title).toBe(RANKS.at(-1)!.title);
    expect(rankFor(Number.NaN).title).toBe(RANKS[0].title);
    expect(rankFor(-5).title).toBe(RANKS[0].title);
  });
});

describe("every possible set of answers (4^7 = 16,384)", () => {
  it("gives an integer 0-100, a known rank and a bounded, non-empty diagnosis; every rank is reachable", () => {
    const seenRanks = new Set<string>();
    const lengths: number[] = [];
    for (let n = 0; n < 4 ** 7; n++) {
      const answers: number[] = [];
      for (let i = 0, m = n; i < 7; i++, m = Math.floor(m / 4)) answers.push(m % 4);
      const r = resultFor(answers);
      if (!Number.isInteger(r.pct) || r.pct < 0 || r.pct > 100) throw new Error(`bad pct ${r.pct} for ${answers}`);
      if (!RANKS.some((x) => x.title === r.rank)) throw new Error(`unknown rank for ${answers}`);
      if (r.diagnosis.trim().length < 20) throw new Error(`diagnosis too short for ${answers}`);
      seenRanks.add(r.rank);
      lengths.push(r.diagnosis.length);
    }
    expect(seenRanks.size).toBe(RANKS.length);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(260);
  });
});

describe("personalised diagnosis", () => {
  it("is deterministic", () => {
    const a = [3, 0, 2, 1, 3, 0, 2];
    expect(resultFor(a)).toEqual(resultFor([...a]));
  });
  it("names the dominant category; ties go to the earlier question; all zeros has none", () => {
    expect(dominantCategory(all(0))).toBeNull();
    expect(dominantCategory([0, 0, 0, 3, 0, 0, 0])).toBe("phone");
    expect(dominantCategory(all(3))).toBe("tys"); // tie: first question wins
    expect(dominantCategory([1, 2, 2, 0, 0, 0, 0])).toBe("procrastination");
    expect(resultFor([0, 0, 0, 3, 0, 0, 0]).diagnosis).toMatch(/phone/i);
    expect(resultFor(all(0)).diagnosis).toMatch(/No red flags/);
  });
  it("different answers can give different diagnoses", () => {
    expect(resultFor([3, 0, 0, 0, 0, 0, 0]).diagnosis).not.toBe(resultFor([0, 0, 0, 3, 0, 0, 0]).diagnosis);
  });
});

describe("share text and links", () => {
  it("includes the result and the Grade Delusion URL", () => {
    const t = shareText({ pct: 73, rank: "Level 66 Highlighter Hoarder" });
    expect(t).toContain("73%");
    expect(t).toContain("Level 66 Highlighter Hoarder");
    expect(t).toContain(site.url);
  });
  it("the parent-quiz CTA URL is exactly the approved one", () => {
    expect(site.gradeSolutionQuizUrl).toBe("https://quiz.gradesolution.com.sg/questions?utm_source=gradedelusion&utm_medium=quiz_result");
    expect(site.gradeSolutionUrl).toBe("https://gradesolution.com.sg");
  });
});

describe("result announcement (screen readers)", () => {
  const src = readFileSync("components/ParodyQuiz.tsx", "utf8");
  it("keeps the live region, hides the animated counter from assistive technology, and keeps the sr-only percentage", () => {
    expect(src).toContain('aria-live="polite"');
    // the counting-up number is aria-hidden...
    expect(src).toMatch(/<p aria-hidden="true"[^>]*>\s*\{shown\}/);
    // ...and the accessible result is the static, sr-only text built from the final percentage (never the counter)
    expect(src).toContain('<span className="sr-only">{result.pct} percent</span>');
    expect(src).not.toMatch(/<span className="sr-only">\s*\{shown\}/);
  });
});

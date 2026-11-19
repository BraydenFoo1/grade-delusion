import { describe, expect, it } from "vitest";
import { EIGHT_BALL_ANSWERS, EXCUSES, TYS_MAX_PAGES, dustOMeter, excuseById, formatIssueDate, nextAnswerIndex } from "@/lib/toys";

describe("Dust-O-Meter", () => {
  it("nothing bought means nothing to dust", () => {
    expect(dustOMeter(0, 0)).toMatchObject({ score: 0, dustMm: 0, title: "Nothing Bought" });
    expect(dustOMeter(0, 500).score).toBe(0);
  });
  it("finishing everything scores 0; done can never exceed bought", () => {
    expect(dustOMeter(500, 500).score).toBe(0);
    expect(dustOMeter(500, 900)).toMatchObject({ done: 500, score: 0, completionPct: 100 });
  });
  it("a big unopened pile scores 100", () => {
    expect(dustOMeter(800, 0).score).toBe(100);
    expect(dustOMeter(TYS_MAX_PAGES, 0).score).toBe(100);
  });
  it("buying more pages raises the score for the same completion", () => {
    expect(dustOMeter(800, 400).score).toBeGreaterThan(dustOMeter(100, 50).score);
  });
  it("is always a 0-100 integer with a title and roast, and clamps bad input", () => {
    for (let b = 0; b <= TYS_MAX_PAGES; b += 70)
      for (let d = 0; d <= TYS_MAX_PAGES; d += 70) {
        const r = dustOMeter(b, d);
        expect(Number.isInteger(r.score) && r.score >= 0 && r.score <= 100).toBe(true);
        expect(r.title.length).toBeGreaterThan(3);
        expect(r.roast.length).toBeGreaterThan(10);
      }
    expect(dustOMeter(-5, Number.NaN).score).toBe(0);
    expect(dustOMeter(1e9, 0).bought).toBe(TYS_MAX_PAGES);
  });
  it("every roast tier is reachable", () => {
    const titles = new Set<string>();
    for (let d = 0; d <= 800; d += 10) titles.add(dustOMeter(800, d).title);
    expect(titles.size).toBeGreaterThanOrEqual(5);
  });
});

describe("certificate content", () => {
  it("has the requested excuses and unique ids", () => {
    const texts = EXCUSES.map((e) => e.text);
    expect(texts).toContain("My brain lagged during Paper 2");
    expect(texts).toContain("I revised the wrong topic");
    expect(new Set(EXCUSES.map((e) => e.id)).size).toBe(EXCUSES.length);
  });
  it("excuseById falls back to the first excuse", () => {
    expect(excuseById("nope")).toBe(EXCUSES[0]);
    expect(excuseById("wrong-topic").text).toBe("I revised the wrong topic");
  });
  it("formats the issue date in English regardless of locale", () => {
    expect(formatIssueDate(new Date(2026, 10, 16))).toBe("16 November 2026");
  });
});

describe("8-ball", () => {
  it("has the required local answers and no duplicates", () => {
    expect(EIGHT_BALL_ANSWERS).toContain("Confirm plus chop coming out.");
    expect(EIGHT_BALL_ANSWERS).toContain("Ask your cher, don’t ask me.");
    expect(EIGHT_BALL_ANSWERS).toContain("Start praying now.");
    expect(new Set(EIGHT_BALL_ANSWERS).size).toBe(EIGHT_BALL_ANSWERS.length);
    expect(EIGHT_BALL_ANSWERS.length).toBeGreaterThanOrEqual(12);
  });
  it("is deterministic with an injected RNG and stays in range", () => {
    expect(nextAnswerIndex(null, () => 0)).toBe(0);
    expect(nextAnswerIndex(null, () => 0.9999999)).toBe(EIGHT_BALL_ANSWERS.length - 1);
    expect(nextAnswerIndex(null, () => 1)).toBe(EIGHT_BALL_ANSWERS.length - 1);
    expect(nextAnswerIndex(null, () => -1)).toBe(0);
  });
  it("never repeats the previous answer", () => {
    for (let prev = 0; prev < EIGHT_BALL_ANSWERS.length; prev++)
      for (const r of [0, 0.1, 0.5, 0.99]) expect(nextAnswerIndex(prev, () => r)).not.toBe(prev);
  });
});

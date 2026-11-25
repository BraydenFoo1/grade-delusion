import { describe, expect, it } from "vitest";
import { countdownState, statusFor, timeLeft, UNANNOUNCED_HEADLINE, unannouncedStatus } from "@/lib/countdown";
import { EXAM_YEAR, EXAMS_2027, isOfficialSource, verifiedTarget, type ExamConfig } from "@/lib/exam-dates";

const DAY = 86_400_000;
const good = {
  iso: "2027-09-24T08:00:00+08:00",
  describes: "First written paper",
  sourceUrl: "https://www.seab.gov.sg/some/official/page",
  verifiedOn: "2026-12-01",
};
const fixture = (official: ExamConfig["official"]): ExamConfig => ({ id: "psle", label: "PSLE", subtitle: "x", official });

describe("timeLeft", () => {
  it("splits a duration into days, hours, minutes, seconds", () => {
    const now = Date.UTC(2027, 0, 1);
    const t = timeLeft(now + 3 * DAY + 4 * 3_600_000 + 5 * 60_000 + 6000, now);
    expect([t.days, t.hours, t.minutes, t.seconds, t.over]).toEqual([3, 4, 5, 6, false]);
  });
  it("never goes negative", () => {
    const t = timeLeft(1000, 5000);
    expect(t).toMatchObject({ totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, over: true });
    expect(timeLeft(1000, 1000).over).toBe(true);
    expect(timeLeft(Number.NaN, 1).over).toBe(true);
  });
  it("handles Singapore-time targets exactly (+08:00 offset)", () => {
    const target = new Date("2027-09-24T08:00:00+08:00");
    expect(target.toISOString()).toBe("2027-09-24T00:00:00.000Z");
    expect(timeLeft(target, Date.parse("2027-09-23T00:00:00Z")).hours).toBe(0);
    expect(timeLeft(target, Date.parse("2027-09-23T00:00:00Z")).days).toBe(1);
  });
});

describe("statusFor bands", () => {
  it("matches the specified bands at the boundaries", () => {
    expect(statusFor(101)).toBe("Plenty of time, relax bro");
    expect(statusFor(100)).not.toBe("Plenty of time, relax bro");
    expect(statusFor(30)).not.toBe("Time to highlight the entire textbook");
    expect(statusFor(29)).toBe("Time to highlight the entire textbook");
    expect(statusFor(3)).toBe("Time to highlight the entire textbook");
    expect(statusFor(2)).toBe("If I sleep 8 hours, osmosis will transfer the notes into my brain");
    expect(statusFor(0)).toBe("If I sleep 8 hours, osmosis will transfer the notes into my brain");
  });
  it("every day count from 0 to 400 has a non-empty status", () => {
    for (let d = 0; d <= 400; d++) expect(statusFor(d).length).toBeGreaterThan(10);
  });
});

describe("exam config", () => {
  it("has exactly the three approved tabs, with no separate N- or O-Level", () => {
    expect(EXAMS_2027.map((e) => e.id)).toEqual(["psle", "sec", "a-level"]);
    expect(EXAM_YEAR).toBe(2027);
  });
  it("every date in the shipped config is fully verified (or absent)", () => {
    for (const e of EXAMS_2027) {
      if (e.official) {
        expect(verifiedTarget(e), `${e.id} has an official date that fails verification`).not.toBeNull();
        expect(isOfficialSource(e.official.sourceUrl)).toBe(true);
      }
    }
  });
  it("accepts a fully verified date", () => {
    expect(verifiedTarget(fixture(good))?.toISOString()).toBe("2027-09-24T00:00:00.000Z");
  });
  it("rejects dates that are missing anything", () => {
    expect(verifiedTarget(fixture(null))).toBeNull();
    expect(verifiedTarget(fixture({ ...good, sourceUrl: "" }))).toBeNull();
    expect(verifiedTarget(fixture({ ...good, verifiedOn: "" }))).toBeNull();
    expect(verifiedTarget(fixture({ ...good, verifiedOn: "yesterday" }))).toBeNull();
    expect(verifiedTarget(fixture({ ...good, describes: "  " }))).toBeNull();
    expect(verifiedTarget(fixture({ ...good, iso: "2027-09-24" }))).toBeNull(); // no time / offset
    expect(verifiedTarget(fixture({ ...good, iso: "2027-09-24T08:00:00" }))).toBeNull(); // no offset
    expect(verifiedTarget(fixture({ ...good, iso: "2027-13-45T08:00:00+08:00" }))).toBeNull();
  });
  it("only trusts seab.gov.sg and moe.gov.sg over https", () => {
    for (const ok of ["https://www.seab.gov.sg/x", "https://seab.gov.sg/", "https://www.moe.gov.sg/national-exams-dates"])
      expect(isOfficialSource(ok)).toBe(true);
    for (const bad of [
      "http://www.seab.gov.sg/x",
      "https://seab.gov.sg.evil.com/",
      "https://evil.com/seab.gov.sg",
      "https://notseab.gov.sg/",
      "https://geniebook.com/exam-preparation/psle/important-dates",
      "ftp://seab.gov.sg",
      "not a url",
    ])
      expect(isOfficialSource(bad), bad).toBe(false);
  });
});

describe("countdownState", () => {
  it("ships in the 'not announced' state for every shipped exam, with a status and no time", () => {
    const hasDates = EXAMS_2027.some((e) => e.official);
    if (hasDates) return; // once real dates are added, the live path is covered by the fixtures below
    for (const e of EXAMS_2027) {
      const s = countdownState(e, Date.now());
      expect(s.kind).toBe("unannounced");
      expect(s.status).toBe(unannouncedStatus(e.id));
      expect(s.status.length).toBeGreaterThan(10);
      expect("time" in s).toBe(false);
    }
    expect(UNANNOUNCED_HEADLINE).toBe("2027 Exam Dates Not Announced Yet");
  });
  it("an unverified date is treated as not announced (never a countdown)", () => {
    expect(countdownState(fixture({ ...good, sourceUrl: "https://example.com/" }), Date.now()).kind).toBe("unannounced");
  });
  it("counts down for a verified fixture and picks the status by days left", () => {
    const target = Date.parse(good.iso);
    const live = countdownState(fixture(good), target - 200 * DAY);
    expect(live.kind).toBe("live");
    if (live.kind === "live") {
      expect(live.time.days).toBe(200);
      expect(live.status).toBe("Plenty of time, relax bro");
      expect(live.describes).toBe("First written paper");
    }
    const close = countdownState(fixture(good), target - 2 * DAY);
    expect(close.status).toMatch(/osmosis/);
    expect(countdownState(fixture(good), target + 1).kind).toBe("over");
  });
  it("every tab has its own unannounced status", () => {
    const lines = new Set(EXAMS_2027.map((e) => unannouncedStatus(e.id)));
    expect(lines.size).toBe(3);
  });
});

import { describe, expect, it } from "vitest";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  CERT_HEIGHT,
  CERT_WIDTH,
  WATERMARK,
  cleanName,
  drawCard,
  drawCertificate,
  NAME_MAX_WIDTH,
  fitText,
  telegramUrl,
  whatsappUrl,
  wrapText,
} from "@/lib/share-card";
import { RANKS, resultFor } from "@/lib/parody-quiz";
import { EXCUSES } from "@/lib/toys";

// Every character is 0.5em wide, which is wider than most real fonts, so passing here is conservative.
const measure = (t: string, size: number) => t.length * size * 0.5;

type Drawn = { text: string; x: number; width: number; font: string };

function fakeCtx(em = 0.5) {
  const drawn: Drawn[] = [];
  const state = { font: "10px x", textAlign: "left" };
  // Track translate()/save()/restore() so text drawn after a translate (the rotated badge and stamp) is placed correctly.
  let originX = 0;
  const stack: number[] = [];
  const sizeOf = () => Number(/(\d+(?:\.\d+)?)px/.exec(state.font)?.[1] ?? 10);
  const ctx = new Proxy(state as Record<string, unknown>, {
    get(t, k: string) {
      if (k === "measureText") return (text: string) => ({ width: text.length * sizeOf() * em });
      if (k === "fillText")
        return (text: string, x: number) => {
          drawn.push({ text, x: originX + x, width: text.length * sizeOf() * em, font: state.font });
        };
      if (k === "save") return () => stack.push(originX);
      if (k === "restore") return () => void (originX = stack.pop() ?? 0);
      if (k === "translate") return (dx: number) => void (originX += dx);
      if (k in t) return t[k];
      return () => undefined; // fillRect, strokeRect, rotate, strokeText…
    },
    set(t, k: string, v) {
      t[k] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, drawn };
}

describe("wrapText / fitText", () => {
  it("wraps on spaces within the width", () => {
    const lines = wrapText("the quick brown fox jumps over the lazy dog", 200, 20, measure);
    for (const l of lines) expect(measure(l, 20)).toBeLessThanOrEqual(200);
    expect(lines.join(" ")).toBe("the quick brown fox jumps over the lazy dog");
  });
  it("splits a single over-long word and handles empty input", () => {
    const lines = wrapText("x".repeat(100), 100, 20, measure);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(measure(l, 20)).toBeLessThanOrEqual(100);
    expect(wrapText("   ", 100, 20, measure)).toEqual([]);
  });
  it("fitText shrinks to fit, then truncates with an ellipsis", () => {
    const fitted = fitText("hello world this is a longer line of text", 400, 2, 60, 20, measure);
    expect(fitted.lines.length).toBeLessThanOrEqual(2);
    expect(fitted.size).toBeLessThan(60);
    const cut = fitText("word ".repeat(200), 300, 2, 30, 20, measure);
    expect(cut.lines).toHaveLength(2);
    expect(cut.lines[1].endsWith("…")).toBe(true);
    expect(measure(cut.lines[1], cut.size)).toBeLessThanOrEqual(300);
  });
});

describe("story card", () => {
  it("is 9:16 at 1080x1920", () => {
    expect(CARD_WIDTH).toBe(1080);
    expect(CARD_HEIGHT).toBe(1920);
    expect(CARD_WIDTH / CARD_HEIGHT).toBeCloseTo(9 / 16, 5);
  });
  it("watermark is the site and handle", () => {
    expect(WATERMARK).toBe("grade-delusion.vercel.app | @gradedelusion");
  });
  it("draws the percentage, rank, diagnosis, branding and watermark, all inside the canvas", () => {
    const result = resultFor([3, 3, 3, 3, 3, 3, 3]);
    const { ctx, drawn } = fakeCtx();
    (ctx as unknown as { textAlign: string }).textAlign = "center";
    drawCard(ctx, { pct: result.pct, rank: result.rank, diagnosis: result.diagnosis });
    const text = drawn.map((d) => d.text).join(" ");
    expect(text).toContain("100%");
    expect(text).toContain(result.rank.toUpperCase());
    expect(text).toContain("GRADE DELUSION™");
    expect(text).toContain("STUDENT EDITION");
    expect(text).toContain("grade-delusion.vercel.app | @gradedelusion");
    // the diagnosis is wrapped across lines: every word must appear
    for (const word of result.diagnosis.split(" ")) expect(text).toContain(word);
    for (const d of drawn) {
      expect(d.x - d.width / 2, d.text).toBeGreaterThanOrEqual(0);
      expect(d.x + d.width / 2, d.text).toBeLessThanOrEqual(CARD_WIDTH);
    }
  });
  it("fits the longest rank with the longest diagnosis without truncation", () => {
    const longest = [...RANKS].sort((a, b) => b.title.length - a.title.length)[0];
    const diagnosis = resultFor([3, 3, 3, 3, 3, 3, 3]).diagnosis;
    const { ctx, drawn } = fakeCtx();
    (ctx as unknown as { textAlign: string }).textAlign = "center";
    drawCard(ctx, { pct: 99, rank: longest.title, diagnosis });
    expect(drawn.some((d) => d.text.endsWith("…"))).toBe(false);
  });
});

describe("certificate", () => {
  it("is A4 landscape and carries the not-official disclaimer", () => {
    expect(CERT_WIDTH / CERT_HEIGHT).toBeCloseTo(1.414, 2);
    const { ctx, drawn } = fakeCtx();
    (ctx as unknown as { textAlign: string }).textAlign = "center";
    drawCertificate(ctx, { name: "Last-Minute Larry", excuse: EXCUSES[0].text, issuedOn: "16 November 2026" });
    const text = drawn.map((d) => d.text).join(" ");
    expect(text).toContain("CERTIFICATE OF DELUSION");
    expect(text).toContain("Last-Minute Larry");
    expect(text).toContain(EXCUSES[0].text);
    expect(text).toMatch(/Not an official document/);
    for (const d of drawn) {
      expect(d.x - d.width / 2, d.text).toBeGreaterThanOrEqual(0);
      expect(d.x + d.width / 2, d.text).toBeLessThanOrEqual(CERT_WIDTH);
    }
  });
  it("copes with the longest name and the longest excuse", () => {
    const longestExcuse = [...EXCUSES].sort((a, b) => b.text.length - a.text.length)[0].text;
    const { ctx, drawn } = fakeCtx();
    (ctx as unknown as { textAlign: string }).textAlign = "center";
    drawCertificate(ctx, { name: cleanName("W".repeat(80)), excuse: longestExcuse, issuedOn: "16 November 2026" });
    for (const d of drawn) {
      expect(d.x - d.width / 2, d.text).toBeGreaterThanOrEqual(0);
      expect(d.x + d.width / 2, d.text).toBeLessThanOrEqual(CERT_WIDTH);
    }
  });
});

describe("certificate long-name edge case", () => {
  // 0.9em per character is wider than any glyph in the display font (a real "W" is ~0.82em), so this is the worst case.
  it("keeps the widest 30-character name whole, clear of the stamp, and everything inside the inner border", () => {
    const { ctx, drawn } = fakeCtx(0.9);
    (ctx as unknown as { textAlign: string }).textAlign = "center";
    drawCertificate(ctx, { name: cleanName("W".repeat(30)), excuse: [...EXCUSES].sort((a, b) => b.text.length - a.text.length)[0].text, issuedOn: "16 November 2026" });
    const name = drawn.find((d) => d.text.startsWith("WWW"));
    expect(name?.text).toBe("W".repeat(30)); // not truncated
    // The stamp's leftmost point is ~1260px (centre 1459, half-width 190, rotated); leave a margin.
    expect(name!.x + name!.width / 2).toBeLessThanOrEqual(1250);
    expect(name!.width).toBeLessThanOrEqual(NAME_MAX_WIDTH);
  });
  it("keeps every line inside the inner border (x 80-1674) with the longest name and excuse", () => {
    const { ctx, drawn } = fakeCtx(0.42); // ~ the display font's average width
    (ctx as unknown as { textAlign: string }).textAlign = "center";
    drawCertificate(ctx, { name: cleanName("W".repeat(30)), excuse: [...EXCUSES].sort((a, b) => b.text.length - a.text.length)[0].text, issuedOn: "16 November 2026" });
    for (const d of drawn) {
      expect(d.x - d.width / 2, d.text).toBeGreaterThanOrEqual(100);
      expect(d.x + d.width / 2, d.text).toBeLessThanOrEqual(CERT_WIDTH - 100);
    }
  });
  it("shrinks (never truncates) a 30-character name at a realistic width too", () => {
    const { ctx, drawn } = fakeCtx(0.5);
    (ctx as unknown as { textAlign: string }).textAlign = "center";
    drawCertificate(ctx, { name: cleanName("Wei Jie Benedict Tan Xiang Yu Z"), excuse: EXCUSES[0].text, issuedOn: "16 November 2026" });
    expect(drawn.some((d) => d.text.endsWith("…"))).toBe(false);
  });
});

describe("cleanName", () => {
  it("trims, collapses spaces, caps at 30 characters", () => {
    expect(cleanName("  Larry   Lim  ")).toBe("Larry Lim");
    expect(cleanName("x".repeat(80))).toHaveLength(30);
  });
  it("falls back for empty or control-only input and strips control / bidi characters", () => {
    expect(cleanName("")).toBe("Anonymous Legend");
    expect(cleanName("   \n\t ")).toBe("Anonymous Legend");
    expect(cleanName("A\u0000B‮C​D")).toBe("A B C D");
  });
  it("counts emoji as single characters and never splits one", () => {
    const out = cleanName("😀".repeat(40));
    expect(Array.from(out)).toHaveLength(30);
    expect(out).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
  });
});

describe("share links", () => {
  it("encode the text and URL", () => {
    const w = whatsappUrl("a b & c?");
    expect(w).toBe("https://wa.me/?text=a%20b%20%26%20c%3F");
    const t = telegramUrl("hi there", "https://grade-delusion.vercel.app/");
    expect(t).toBe("https://t.me/share/url?url=https%3A%2F%2Fgrade-delusion.vercel.app%2F&text=hi%20there");
  });
});

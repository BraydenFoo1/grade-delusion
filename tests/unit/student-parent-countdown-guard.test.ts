// The Student/Parent switcher and exam countdown are browser-only entertainment. This scans their SOURCE to keep
// them that way: no network calls, no tracking, no server modules, and no browser storage.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const FILES = [
  "lib/countdown.ts",
  "lib/exam-dates.ts",
  "components/StudentParentSwitcher.tsx",
  "components/ExamCountdown.tsx",
  "components/toys/shared.ts",
];

const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8");
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("switcher and countdown stay client-only and tracking-free", () => {
  const FORBIDDEN: [string, RegExp][] = [
    ["network call (fetch)", /\bfetch\s*\(/],
    ["XMLHttpRequest", /XMLHttpRequest/],
    ["sendBeacon", /sendBeacon/],
    ["WebSocket / EventSource", /\b(WebSocket|EventSource)\b/],
    ["document.cookie", /document\.cookie/],
    ["browser storage", /\b(localStorage|sessionStorage|indexedDB)\b/],
    ["analytics / pixels", /\b(gtag|fbq|dataLayer|ga\(|_paq|posthog|mixpanel|hotjar)\b/i],
    ["external script injection", /createElement\(\s*["']script["']/],
    ["server actions", /["']use server["']/],
    ["server-only modules", /@\/lib\/(db|auth|actions|services|platform)\b|next\/headers|server-only/],
  ];

  for (const f of FILES) {
    it(`${f} exists and has no forbidden APIs`, () => {
      expect(fs.existsSync(path.join(root, f)), f).toBe(true);
      const src = stripComments(read(f));
      for (const [what, re] of FORBIDDEN) expect(re.test(src), `${f}: ${what}`).toBe(false);
    });
  }

  it("the only external hosts are Grade Solution and the official exam boards", () => {
    const allowed = new Set(["gradesolution.com.sg", "www.seab.gov.sg", "seab.gov.sg", "www.moe.gov.sg", "moe.gov.sg"]);
    for (const f of FILES)
      for (const m of stripComments(read(f)).matchAll(/https?:\/\/[^\s"'`)]+/g))
        expect(allowed.has(new URL(m[0].replace(/[,;]+$/, "")).hostname), `${f}: ${m[0]}`).toBe(true);
  });

  it("ships no exam dates: every exam is unannounced until verified", () => {
    expect(fs.readFileSync(path.join(root, "lib/exam-dates.ts"), "utf8").match(/official: null,/g)?.length).toBe(3);
  });
});

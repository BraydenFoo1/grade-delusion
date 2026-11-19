// The new features are browser-only entertainment. This scans their SOURCE to keep them that way: no network
// calls, no tracking, no server modules, and nothing in browser storage except the one consent key.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const NEW_FILES = [
  "lib/consent.ts",
  "lib/countdown.ts",
  "lib/exam-dates.ts",
  "lib/parody-quiz.ts",
  "lib/share-card.ts",
  "lib/toys.ts",
  "components/CookieConsent.tsx",
  "components/StudentParentSwitcher.tsx",
  "components/ParodyQuiz.tsx",
  "components/quiz/StoryCard.tsx",
  "components/ExamCountdown.tsx",
  "components/MiniToys.tsx",
  "components/toys/DustOMeter.tsx",
  "components/toys/CertificateGenerator.tsx",
  "components/toys/ExamEightBall.tsx",
  "components/toys/shared.ts",
];

const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8");
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("student toys stay client-only and tracking-free", () => {
  it("all the new files exist", () => {
    for (const f of NEW_FILES) expect(fs.existsSync(path.join(root, f)), f).toBe(true);
  });

  const FORBIDDEN: [string, RegExp][] = [
    ["network call (fetch)", /\bfetch\s*\(/],
    ["XMLHttpRequest", /XMLHttpRequest/],
    ["sendBeacon", /sendBeacon/],
    ["WebSocket / EventSource", /\b(WebSocket|EventSource)\b/],
    ["document.cookie", /document\.cookie/],
    ["analytics / pixels", /\b(gtag|fbq|dataLayer|ga\(|_paq|posthog|mixpanel|hotjar)\b/i],
    ["external script injection", /createElement\(\s*["']script["']/],
    ["IndexedDB", /indexedDB/],
    ["server actions", /["']use server["']/],
    ["server-only modules", /@\/lib\/(db|auth|kai|actions|services|platform)\b|next\/headers|server-only/],
  ];

  for (const f of NEW_FILES) {
    it(`${f} has no forbidden APIs`, () => {
      const src = stripComments(read(f));
      for (const [what, re] of FORBIDDEN) expect(re.test(src), `${f}: ${what}`).toBe(false);
    });
  }

  it("browser storage is used only by lib/consent.ts, and only for gd_cookie_consent", () => {
    for (const f of NEW_FILES) {
      const src = stripComments(read(f));
      const usesStorage = /\b(localStorage|sessionStorage)\b/.test(src);
      expect(usesStorage, f).toBe(f === "lib/consent.ts");
    }
    const consent = stripComments(read("lib/consent.ts"));
    expect(consent.match(/getItem\(|setItem\(/g)?.length).toBeGreaterThan(0);
    expect(consent).toContain('CONSENT_KEY = "gd_cookie_consent"');
    expect(consent.match(/setItem\(\s*[A-Za-z_]+/g)).toEqual(["setItem(CONSENT_KEY"]);
  });

  it("the only external navigations are Grade Solution, WhatsApp and Telegram", () => {
    const urls = new Set<string>();
    for (const f of NEW_FILES) for (const m of stripComments(read(f)).matchAll(/https?:\/\/[^\s"'`)]+/g)) urls.add(new URL(m[0].replace(/[,;]+$/, "")).hostname);
    const allowed = new Set(["wa.me", "t.me", "www.seab.gov.sg", "seab.gov.sg", "www.moe.gov.sg", "moe.gov.sg", "grade-delusion.vercel.app", "gradesolution.com.sg", "quiz.gradesolution.com.sg"]);
    for (const h of urls) expect(allowed.has(h), `unexpected host ${h}`).toBe(true);
  });
});

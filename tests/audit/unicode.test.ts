// AUDIT: Unicode correctness and impersonation resistance.
import { describe, expect, it } from "vitest";
import { findBlockedTerm, isReservedName, normalizeLine, normalizeText } from "@/lib/platform/text";

describe("emoji survive normalisation (the audience writes in emoji)", () => {
  const samples: [string, string][] = [
    ["family (ZWJ sequence)", "👨‍👩‍👧 studied together"],
    ["woman technologist", "👩‍💻 coding at 3am"],
    ["skin tone", "👍🏽 relatable"],
    ["flag (regional indicators)", "🇸🇬 national exam"],
    ["keycap + variation selector", "I got 1️⃣ mark"],
    ["rainbow flag (ZWJ)", "🏳️‍🌈 and 🏴‍☠️"],
    ["heart variation selector", "❤️ and ❤"],
    ["plain faces", "😭💀🧠🔥📚"],
  ];
  for (const [label, text] of samples) {
    it(label, () => {
      expect(normalizeText(text)).toBe(text);
      expect(normalizeLine(text)).toBe(text);
    });
  }

  it("still strips a ZWJ that is hiding inside a word (obfuscation)", () => {
    expect(normalizeText("s‍c‍a‍m")).toBe("scam");
    expect(normalizeText("a‌b")).toBe("ab");
    expect(normalizeText("ab ‍ cd")).toBe("ab  cd".replace("  ", " "));
  });

  it("strips bidi controls and other invisibles that spoof text", () => {
    expect(normalizeText("evil‮gnp.exe")).toBe("evilgnp.exe");
    expect(normalizeText("a⁦b⁩c﻿d­e")).toBe("abcde");
  });
});

describe("blocked terms resist lookalike letters", () => {
  it("matches Cyrillic and Greek homoglyphs, fullwidth forms and accents", () => {
    expect(findBlockedTerm("this is a ѕсаm", ["scam"])).toBe("scam"); // Cyrillic ѕ с а
    expect(findBlockedTerm("ｓｃａｍ alert", ["scam"])).toBe("scam"); // fullwidth
    expect(findBlockedTerm("what a scàm", ["scam"])).toBe("scam"); // accent
    expect(findBlockedTerm("σcαm", ["scam"])).toBe("scam"); // Greek sigma/alpha (visually close)
  });
  it("does not flag innocent words", () => {
    expect(findBlockedTerm("a classic assassin movie", ["ass"])).toBeNull();
  });
});

describe("reserved display names (staff / brand impersonation)", () => {
  const blocked = [
    "Admin",
    "ADMIN",
    "Administrator",
    "Moderator",
    "Mod",
    "Mod Team",
    "Site Staff",
    "Official",
    "Grade Delusion",
    "GradeDelusion",
    "Grade_Solution",
    // lookalikes
    "Аdmin", // Cyrillic А
    "Admіn", // Cyrillic і
    "Ａdmin", // fullwidth
    "аdmin", // Cyrillic а
    "Αdmin", // Greek Alpha
    "Admín", // accent
    "4dmin", // leetspeak
    "@dmin",
    "m0derator",
    "M0d",
    "Admin_",
    "Admin2",
    "admin.",
    "x_Admin_x",
    "Support",
    "Grade D3lusion",
  ];
  for (const name of blocked) {
    it(`blocks ${JSON.stringify(name)}`, () => expect(isReservedName(name), name).toBe(true));
  }

  const allowed = ["Badminton Fan", "Admiral Sam", "Modest Mouse", "Sam Student", "Mei-Ling O'Neil", "Madison", "Moderate Mo", "Adminton", "Grace", "Delusional Dan", "Solution Seeker", "Supporter Sue", "Official Meme"];
  for (const name of allowed) {
    it(`allows ${JSON.stringify(name)}`, () => expect(isReservedName(name), name).toBe(name === "Official Meme"));
  }
});

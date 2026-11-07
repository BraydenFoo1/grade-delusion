import { describe, expect, it } from "vitest";
import { assertAdmin, assertCanParticipate, assertStaff, canActOnUser, canChangeRole, isSuspended, type Actor } from "@/lib/platform/actor";
import { AppError } from "@/lib/platform/errors";
import { assertContentAllowed } from "@/lib/platform/spam";
import { containsLink, escapeLike, findBlockedTerm, looksLikeRepeatSpam, normalizeLine, normalizeText } from "@/lib/platform/text";
import { feedQuery, parse, postInput, reportInput, settingsSchema, signUpInput } from "@/lib/platform/validation";
import { toRole } from "@/lib/platform/constants";

const actor = (over: Partial<Actor> = {}): Actor => ({
  id: "a",
  name: "A",
  role: "user",
  emailVerified: true,
  banned: false,
  banExpires: null,
  ...over,
});

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof AppError ? e.code : "OTHER";
  }
  return undefined;
}

describe("permissions", () => {
  it("treats unknown roles as plain users", () => {
    expect(toRole("superadmin")).toBe("user");
    expect(toRole(undefined)).toBe("user");
    expect(toRole("moderator")).toBe("moderator");
  });

  it("requires verification and a non-suspended account to participate", () => {
    expect(code(() => assertCanParticipate(actor()))).toBeUndefined();
    expect(code(() => assertCanParticipate(actor({ emailVerified: false })))).toBe("UNVERIFIED");
    expect(code(() => assertCanParticipate(actor({ banned: true })))).toBe("SUSPENDED");
  });

  it("lets a timed suspension expire but never a permanent ban", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    expect(isSuspended({ banned: true, banExpires: new Date("2026-01-09T00:00:00Z") }, now)).toBe(false);
    expect(isSuspended({ banned: true, banExpires: new Date("2026-01-11T00:00:00Z") }, now)).toBe(true);
    expect(isSuspended({ banned: true, banExpires: null }, now)).toBe(true);
    expect(isSuspended({ banned: false, banExpires: null }, now)).toBe(false);
  });

  it("limits staff and admin areas by role, and a suspended staff member loses access", () => {
    expect(code(() => assertStaff(actor({ role: "user" })))).toBe("FORBIDDEN");
    expect(code(() => assertStaff(actor({ role: "moderator" })))).toBeUndefined();
    expect(code(() => assertStaff(actor({ role: "moderator", banned: true })))).toBe("FORBIDDEN");
    expect(code(() => assertAdmin(actor({ role: "moderator" })))).toBe("FORBIDDEN");
    expect(code(() => assertAdmin(actor({ role: "admin" })))).toBeUndefined();
  });

  it("moderators can only act on regular users; admins on users and moderators; nobody on admins or themselves", () => {
    const mod = { id: "m", role: "moderator" as const };
    const adm = { id: "ad", role: "admin" as const };
    expect(canActOnUser(mod, { id: "u", role: "user" })).toBe(true);
    expect(canActOnUser(mod, { id: "m2", role: "moderator" })).toBe(false);
    expect(canActOnUser(mod, { id: "x", role: "admin" })).toBe(false);
    expect(canActOnUser(mod, { id: "m", role: "moderator" })).toBe(false);
    expect(canActOnUser(adm, { id: "m", role: "moderator" })).toBe(true);
    expect(canActOnUser(adm, { id: "ad2", role: "admin" })).toBe(false);
    expect(canActOnUser(adm, { id: "ad", role: "admin" })).toBe(false);
    expect(canActOnUser({ id: "u", role: "user" }, { id: "v", role: "user" })).toBe(false);
  });

  it("only admins change roles, never their own, and a no-op change is rejected", () => {
    const adm = { id: "ad", role: "admin" as const };
    expect(canChangeRole(adm, { id: "u", role: "user" }, "moderator")).toBe(true);
    expect(canChangeRole(adm, { id: "ad", role: "admin" }, "user")).toBe(false);
    expect(canChangeRole(adm, { id: "u", role: "user" }, "user")).toBe(false);
    expect(canChangeRole({ id: "m", role: "moderator" }, { id: "u", role: "user" }, "moderator")).toBe(false);
  });
});

describe("text hygiene", () => {
  it("strips invisible and bidi-control characters and collapses whitespace", () => {
    expect(normalizeText("  hel​lo‮   wor\u0000ld  \n\n\n\nbye ")).toBe("hello world\n\nbye");
    expect(normalizeLine("a\n\n b   c")).toBe("a b c");
  });

  it("detects links, domains and e-mail addresses but not ordinary prose", () => {
    for (const bad of ["see https://x.co", "go to www.example", "buy at cheap.shop now", "mail me a@b.com", "join t.me/foo"]) {
      expect(containsLink(bad), bad).toBe(true);
    }
    for (const good of ["I will study tomorrow. Honestly.", "Mr. Tan said ok.u.k", "I got 99.5% so A. Obviously."]) {
      expect(containsLink(good), good).toBe(false);
    }
  });

  it("flags keyboard-mash and repeated-word spam", () => {
    expect(looksLikeRepeatSpam("aaaaaaaaaaaaaaaa")).toBe(true);
    expect(looksLikeRepeatSpam("buy buy buy buy buy buy buy now")).toBe(true);
    expect(looksLikeRepeatSpam("I will study tomorrow for sure, like really, tomorrow")).toBe(false);
  });

  it("matches blocked terms through light obfuscation without false positives on short terms", () => {
    expect(findBlockedTerm("this is totally Sc4m", ["scam"])).toBe("scam");
    expect(findBlockedTerm("f r e e m o n e y", ["free money"])).toBe("free money");
    expect(findBlockedTerm("a classic class", ["ass"])).toBeNull();
    expect(findBlockedTerm("fine text", [])).toBeNull();
  });

  it("escapes LIKE wildcards", () => {
    expect(escapeLike("100%_done\\")).toBe("100\\%\\_done\\\\");
    // control characters are dropped: a NUL byte would make Postgres reject the whole query (a 500 on staff search)
    expect(escapeLike("a\u0000b")).toBe("ab");
    expect(escapeLike("\u0001%\u001f")).toBe("\\%");
  });

  it("assertContentAllowed throws friendly validation errors without echoing blocked terms", () => {
    const rules = { allowLinks: false, blockedTerms: ["secretword"] };
    expect(code(() => assertContentAllowed("fine words here", rules))).toBeUndefined();
    expect(code(() => assertContentAllowed("see https://spam.example", rules))).toBe("VALIDATION");
    expect(code(() => assertContentAllowed("yo secretword yo", rules))).toBe("VALIDATION");
    try {
      assertContentAllowed("yo secretword yo", rules);
    } catch (e) {
      expect((e as AppError).message).not.toMatch(/secretword/);
    }
    expect(code(() => assertContentAllowed("https://ok.example", { ...rules, allowLinks: true }))).toBeUndefined();
  });
});

describe("validation", () => {
  it("normalises and bounds post text", () => {
    expect(parse(postInput, { body: "  I will start revising​ tomorrow.  ", category: "exams" }).body).toBe("I will start revising tomorrow.");
    expect(code(() => parse(postInput, { body: "short", category: "exams" }))).toBe("VALIDATION");
    expect(code(() => parse(postInput, { body: "x".repeat(501), category: "exams" }))).toBe("VALIDATION");
    expect(code(() => parse(postInput, { body: "A long enough delusion", category: "nope" }))).toBe("VALIDATION");
  });

  it("requires 13+ and terms for sign-up and rejects the honeypot", () => {
    const base = { name: "Sam Tan", email: " Sam@Example.com ", password: "correct horse battery", ageConfirmed: true, termsAccepted: true };
    const parsed = parse(signUpInput, base);
    expect(parsed.email).toBe("sam@example.com");
    expect(code(() => parse(signUpInput, { ...base, ageConfirmed: false }))).toBe("VALIDATION");
    expect(code(() => parse(signUpInput, { ...base, termsAccepted: undefined }))).toBe("VALIDATION");
    expect(code(() => parse(signUpInput, { ...base, website: "http://bot" }))).toBe("VALIDATION");
    expect(code(() => parse(signUpInput, { ...base, password: "short" }))).toBe("VALIDATION");
  });

  it("rejects display names that look like e-mail addresses, links or are the wrong shape", () => {
    const mk = (name: string) => () => parse(signUpInput, { name, email: "a@b.co", password: "correct horse battery", ageConfirmed: true, termsAccepted: true });
    expect(code(mk("sam@example.com"))).toBe("VALIDATION");
    expect(code(mk("www.spam"))).toBe("VALIDATION");
    expect(code(mk("<script>"))).toBe("VALIDATION");
    expect(code(mk("x"))).toBe("VALIDATION");
    expect(code(mk("Mei-Ling O'Neil_2"))).toBeUndefined();
  });

  it("validates report targets and reasons", () => {
    const id = "123e4567-e89b-42d3-a456-426614174000";
    expect(parse(reportInput, { targetType: "post", targetId: id, reason: "spam", note: "  " }).note).toBeUndefined();
    expect(code(() => parse(reportInput, { targetType: "user", targetId: id, reason: "spam" }))).toBe("VALIDATION");
    expect(code(() => parse(reportInput, { targetType: "post", targetId: "nope", reason: "spam" }))).toBe("VALIDATION");
  });

  it("applies feed defaults and clamps page numbers", () => {
    expect(parse(feedQuery, {})).toEqual({ category: "all", sort: "new", page: 1 });
    expect(code(() => parse(feedQuery, { page: "0" }))).toBe("VALIDATION");
    expect(code(() => parse(feedQuery, { sort: "random" }))).toBe("VALIDATION");
  });

  it("gives settings safe defaults", () => {
    const s = parse(settingsSchema, {});
    expect(s.registrationOpen).toBe(true);
    expect(s.allowLinks).toBe(false);
    expect(s.dailyPostLimit).toBe(5);
    expect(code(() => parse(settingsSchema, { dailyPostLimit: 0 }))).toBe("VALIDATION");
  });
});

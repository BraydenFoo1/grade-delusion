import { describe, expect, it } from "vitest";
import { deleteAccountEmail, existingAccountEmail, resetPasswordEmail, verificationEmail } from "@/lib/email/templates";
import { formatDate, plural, timeAgo } from "@/lib/platform/format";
import { safeNext } from "@/lib/platform/redirect";

describe("safeNext (post-login redirect)", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/community")).toBe("/community");
    expect(safeNext("/community/123?x=1#c")).toBe("/community/123?x=1#c");
    expect(safeNext("/admin/queue")).toBe("/admin/queue");
  });

  it("falls back for anything that could leave the site", () => {
    for (const bad of [
      "https://evil.example",
      "http://evil.example/x",
      "//evil.example",
      "///evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "data:text/html,hi",
      "evil.example",
      "",
      undefined,
      null,
      "/ok\nSet-Cookie: x=1",
      "/" + "a".repeat(400),
    ]) {
      expect(safeNext(bad as string | null | undefined), String(bad)).toBe("/dashboard");
    }
  });

  it("never redirects back to the auth pages themselves", () => {
    for (const p of ["/sign-in", "/sign-up?x=1", "/forgot-password", "/reset-password/abc", "/check-email"]) {
      expect(safeNext(p)).toBe("/dashboard");
    }
    expect(safeNext("/sign-in-help")).toBe("/sign-in-help"); // only the exact pages
    expect(safeNext("", "/home")).toBe("/home");
  });
});

describe("e-mail templates", () => {
  const evil = `<script>alert(1)</script>"><img src=x onerror=alert(2)>`;

  it("escape the display name everywhere in the HTML", () => {
    for (const mail of [
      verificationEmail({ to: "a@b.co", name: evil, url: "https://site.example/v?token=1" }),
      resetPasswordEmail({ to: "a@b.co", name: evil, url: "https://site.example/r?token=1" }),
      deleteAccountEmail({ to: "a@b.co", name: evil, url: "https://site.example/d?token=1" }),
      existingAccountEmail({ to: "a@b.co", name: evil, signInUrl: "https://site.example/sign-in" }),
    ]) {
      expect(mail.html).not.toContain("<script>");
      expect(mail.html).not.toContain("<img");
      expect(mail.html).toContain("&lt;script&gt;");
    }
  });

  it("refuse to put a non-http(s) link in a button", () => {
    expect(() => verificationEmail({ to: "a@b.co", name: "Sam", url: "javascript:alert(1)" })).toThrow();
    expect(() => resetPasswordEmail({ to: "a@b.co", name: "Sam", url: "not a url" })).toThrow();
  });

  it("carry the link in both the HTML button and the plain-text part", () => {
    const url = "https://site.example/api/auth/verify-email?token=abc&callbackURL=%2Fdashboard";
    const mail = verificationEmail({ to: "a@b.co", name: "Sam", url });
    expect(mail.text).toContain(url);
    expect(mail.html).toContain("token=abc&amp;callbackURL"); // attribute-escaped
    expect(mail.subject).toMatch(/confirm/i);
  });
});

describe("formatting", () => {
  const now = new Date("2026-11-07T10:00:00Z");
  it("describes recent times in words and older ones as dates (fixed Singapore time zone)", () => {
    expect(timeAgo(new Date("2026-11-07T09:59:50Z"), now)).toBe("just now");
    expect(timeAgo(new Date("2026-11-07T09:55:00Z"), now)).toBe("5 min ago");
    expect(timeAgo(new Date("2026-11-07T07:00:00Z"), now)).toBe("3 h ago");
    expect(timeAgo(new Date("2026-11-05T10:00:00Z"), now)).toBe("2 d ago");
    expect(timeAgo(new Date("2026-10-01T10:00:00Z"), now)).toBe("1 Oct 2026");
    expect(formatDate("2026-11-07T20:00:00Z")).toBe("8 Nov 2026"); // already the 8th in Singapore
  });

  it("pluralises", () => {
    expect(plural(1, "post")).toBe("1 post");
    expect(plural(0, "post")).toBe("0 posts");
    expect(plural(2, "match", "matches")).toBe("2 matches");
  });
});

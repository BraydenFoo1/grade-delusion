import { readFileSync } from "node:fs";
import { legal } from "@/lib/site";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_KEY,
  CONSENT_VALUE,
  onConsentChange,
  readConsent,
  resetConsentMemory,
  writeConsent,
  type StorageLike,
} from "@/lib/consent";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

const brokenStorage: StorageLike = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

beforeEach(() => resetConsentMemory());

describe("cookie-information acknowledgement", () => {
  it("uses the documented key and the single value 'acknowledged'", () => {
    expect(CONSENT_KEY).toBe("gd_cookie_consent");
    expect(CONSENT_VALUE).toBe("acknowledged");
  });

  it("is not acknowledged by default", () => {
    expect(readConsent(memoryStorage())).toBeNull();
  });

  it("round-trips 'acknowledged' and stores nothing else", () => {
    const s = memoryStorage();
    expect(writeConsent(s)).toBe(true);
    expect(readConsent(s)).toBe("acknowledged");
    expect(Object.keys(s.data)).toEqual([CONSENT_KEY]);
    expect(s.data[CONSENT_KEY]).toBe("acknowledged");
  });

  it("treats any other stored value (including the old two-choice words) as not acknowledged", () => {
    for (const v of ["essential", "accepted", "yes please", "", "ACKNOWLEDGED"]) {
      expect(readConsent(memoryStorage({ [CONSENT_KEY]: v })), v).toBeNull();
    }
  });

  it("does not crash when storage throws, and still lasts for the page view", () => {
    expect(readConsent(brokenStorage)).toBeNull();
    expect(writeConsent(brokenStorage)).toBe(false);
    expect(readConsent(null)).toBeNull();
  });

  it("notifies listeners when it changes, and stops after unsubscribe", () => {
    const cb = vi.fn();
    const off = onConsentChange(cb);
    writeConsent(memoryStorage());
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    writeConsent(memoryStorage());
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe("banner and Privacy Policy match the implementation", () => {
  const banner = readFileSync("components/CookieConsent.tsx", "utf8");
  const privacy = readFileSync("app/privacy/page.tsx", "utf8");

  it("the banner has exactly one button, 'Got it', and no accept/decline choice", () => {
    expect(banner.match(/<button\b/g)).toHaveLength(1);
    expect(banner).toContain("Got it");
    expect(banner).not.toMatch(/Essential Only|Accept All/);
    expect(banner).toContain("writeConsent()");
  });

  it("the Privacy Policy discloses the preference and no longer says there is no cookie banner", () => {
    expect(privacy).toContain("gd_cookie_consent");
    expect(privacy).toContain("acknowledged");
    expect(privacy).not.toContain("no cookie banner");
    expect(privacy).toContain("not transmitted to our servers by the consent feature");
    expect(privacy).toMatch(/behavioural tracking/);
    // it is local storage, never described as a browser cookie
    expect(privacy).toMatch(/consent preference<\/strong> \(<code>gd_cookie_consent<\/code>\) stored in your browser&apos;s local storage/);
  });

  it("the fonts claim holds: fonts come from next/font (self-hosted), with no Google stylesheet or script tags in the app", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(layout).toContain('from "next/font/google"');
    expect(layout).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  it("Terms and Privacy have independent revision dates, and only Privacy passes its own", () => {
    expect(legal.lastUpdated).toBe("7 November 2026"); // Terms: unchanged, used by default
    expect(legal.privacyLastUpdated).toBe("18 November 2026");
    expect(privacy).toContain("lastUpdated={legal.privacyLastUpdated}");
    expect(readFileSync("app/terms/page.tsx", "utf8")).not.toMatch(/lastUpdated/);
    expect(readFileSync("components/LegalPage.tsx", "utf8")).toContain("lastUpdated = legal.lastUpdated");
  });
});

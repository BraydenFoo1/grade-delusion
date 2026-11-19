// Cookie-consent preference.
//
// The banner is a single acknowledgement. This stores ONE fixed string ("acknowledged") under one localStorage key so
// the banner is not shown again. There is no identifier, no timestamp, nothing sent anywhere. It is preference storage,
// in the same category as the saved theme choice; see docs/CONSENT.md and the Privacy Policy (section 4).
//
// There is no accept/decline choice here because nothing optional is switched on: the site has no analytics,
// advertising pixels or tracking scripts. If any are ever added, the Privacy Policy must be updated first and a real
// choice (with a gate in front of the script) designed then.

export const CONSENT_KEY = "gd_cookie_consent";

export const CONSENT_VALUE = "acknowledged";
export type ConsentValue = typeof CONSENT_VALUE;

/** The part of Storage this module needs. Injectable so tests can run in Node. */
export type StorageLike = Pick<Storage, "getItem" | "setItem">;

// If the browser refuses storage (private mode, blocked site data), the choice still lasts for this page view.
let memoryValue: ConsentValue | null = null;
const listeners = new Set<() => void>();

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // accessing localStorage can itself throw
  }
}

export function isConsentValue(value: unknown): value is ConsentValue {
  return value === CONSENT_VALUE;
}

/** "acknowledged" once the visitor has used the banner, or null (also for any other stored value). */
export function readConsent(storage: StorageLike | null = browserStorage()): ConsentValue | null {
  if (storage) {
    try {
      const raw = storage.getItem(CONSENT_KEY);
      if (isConsentValue(raw)) return raw;
      if (raw !== null) return null; // anything else under our key counts as "not acknowledged"
    } catch {
      /* fall through to the in-memory value */
    }
  }
  return storage === browserStorage() ? memoryValue : null;
}

/** Saves the acknowledgement. Returns false when it could not be persisted (it still applies until the page is closed). */
export function writeConsent(storage: StorageLike | null = browserStorage()): boolean {
  let persisted = false;
  if (storage) {
    try {
      storage.setItem(CONSENT_KEY, CONSENT_VALUE);
      persisted = true;
    } catch {
      /* quota or blocked storage */
    }
  }
  if (storage === browserStorage()) memoryValue = CONSENT_VALUE;
  listeners.forEach((l) => l());
  return persisted;
}

/** Calls back whenever the acknowledgement changes in this tab or another one. Returns an unsubscribe function. */
export function onConsentChange(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === CONSENT_KEY) callback();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/** Test helper: forget the in-memory fallback. */
export function resetConsentMemory(): void {
  memoryValue = null;
}

// Text hygiene shared by every place user-written text enters the system.
// The output is only ever rendered as plain text by React (never as HTML), so this is about quality
// and abuse prevention, not about escaping.

// Zero-width and bidi-control characters (used to spoof or hide text), BOM and other invisibles.
// U+200C/U+200D (ZWNJ / ZWJ) are handled separately: the joiner is what glues multi-person and flag emoji
// together (👨‍👩‍👧, 👩‍💻, 🏳️‍🌈), so it is kept between emoji and removed everywhere else.
const INVISIBLES = /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180E\u200B\u200E\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0D\uFEFF\uFFA0]/g;
const STRAY_JOINERS = /(?<![\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F])[\u200C\u200D]|[\u200C\u200D](?!\p{Extended_Pictographic})/gu;
// ASCII control characters except tab and newline.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Trim, normalise to NFC, drop invisible/control characters and collapse runaway whitespace. */
export function normalizeText(input: string): string {
  return input
    .normalize("NFC")
    .replace(INVISIBLES, "")
    .replace(STRAY_JOINERS, "")
    .replace(CONTROL, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ") // runs of spaces/tabs → one space
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A single-line variant for names and short fields. */
export function normalizeLine(input: string): string {
  return normalizeText(input).replace(/\n+/g, " ").replace(/ {2,}/g, " ").trim();
}

const TLDS =
  "com|net|org|io|co|sg|edu|gov|me|ly|gg|xyz|app|dev|info|biz|tv|ru|cn|top|site|online|link|click|shop|store|live|club|vip|cc|to|ai|fm|ws|tk|ml|ga|cf|gq|pw|us|uk|de|fr|jp|kr|in";
const LINK_PATTERNS = [
  /\bhttps?:\/\//i,
  /\bwww\./i,
  new RegExp(`\\b[a-z0-9-]{2,}\\.(?:${TLDS})\\b(?:\\/|\\b)`, "i"),
  /\b[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z]{2,}\b/i, // e-mail addresses double as contact spam
  /\b(?:t\.me|wa\.me|bit\.ly|discord\.gg)\b/i,
];

export function containsLink(text: string): boolean {
  return LINK_PATTERNS.some((re) => re.test(text));
}

/** Long runs of one character, or one word repeated over and over: typical keyboard-mash spam. */
export function looksLikeRepeatSpam(text: string): boolean {
  if (/(.)\1{11,}/u.test(text)) return true;
  const words = text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
  if (words.length >= 8) {
    const counts = new Map<string, number>();
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
    const top = Math.max(...counts.values());
    if (top >= 6 && top / words.length > 0.5) return true;
  }
  return false;
}

// Letters from other alphabets that are drawn like Latin ones (and a few Latin look-alikes that don't
// decompose). Used so "ѕсаm" or "Аdmin" can't dodge a blocked word or a reserved name.
const CONFUSABLES: Record<string, string> = {
  // Cyrillic
  а: "a", в: "b", г: "r", е: "e", ё: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x",
  і: "i", ї: "i", ј: "j", ѕ: "s", ԁ: "d", ԛ: "q", ԝ: "w", һ: "h", ӏ: "l", ґ: "r", ь: "b",
  // Greek
  α: "a", β: "b", γ: "y", ε: "e", ζ: "z", η: "n", ι: "i", κ: "k", μ: "u", ν: "v", ο: "o", ρ: "p", σ: "s", ς: "s",
  τ: "t", υ: "u", φ: "f", χ: "x", ω: "w",
  // Latin letters that don't decompose
  ı: "i", ł: "l", ø: "o", đ: "d", ħ: "h", ŧ: "t", ß: "ss", æ: "ae", œ: "oe",
};

/** Lowercase, strip accents and compatibility forms (fullwidth, circled, maths letters), map look-alike letters. */
export function deconfuse(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\u0000-\u007f]/g, (c) => CONFUSABLES[c] ?? c);
}

/** De-obfuscation for blocked-term matching: look-alike letters, leetspeak, punctuation tricks. */
function fold(text: string): string {
  return deconfuse(text)
    .replace(/[0@4]/g, (c) => (c === "0" ? "o" : "a"))
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t")
    .replace(/[^\p{L}\p{N}]+/gu, " ");
}

const RESERVED_WORDS = new Set(["admin", "admins", "administrator", "administrators", "mod", "mods", "moderator", "moderators", "staff", "official", "support"]);
const RESERVED_BRANDS = ["gradedelusion", "gradesolution"];

/**
 * Would this display name let a member pass as staff or as the brand? Compared word by word after folding
 * look-alike letters and leetspeak, so "Аdmin" (Cyrillic А), "4dmin", "Admin_" and "x_Admin_x" are caught while
 * "Badminton Fan", "Admiral Sam" and "Modest Mouse" are not.
 */
export function isReservedName(name: string): boolean {
  const words = (s: string) => s.split(/[^a-z0-9]+/).filter(Boolean).map((w) => w.replace(/\d+$/, ""));
  const plain = words(deconfuse(name));
  const leet = words(fold(name).replace(/ /g, "_"));
  if ([...plain, ...leet].some((w) => RESERVED_WORDS.has(w))) return true;
  const squashed = fold(name).replace(/ /g, "");
  return RESERVED_BRANDS.some((b) => squashed.includes(b));
}

/** Returns the first blocked term found (as an admin typed it), or null. */
export function findBlockedTerm(text: string, terms: readonly string[]): string | null {
  if (terms.length === 0) return null;
  const haystack = ` ${fold(text)} `;
  const squashed = fold(text).replace(/ /g, "");
  for (const term of terms) {
    const t = fold(term).trim();
    if (!t) continue;
    if (haystack.includes(` ${t} `)) return term;
    // Multi-character terms also match when spaced out ("b a d w o r d"), but only for longer terms,
    // to avoid false positives on short ones.
    if (t.replace(/ /g, "").length >= 5 && squashed.includes(t.replace(/ /g, ""))) return term;
  }
  return null;
}

/**
 * Prepare a search term for a LIKE/ILIKE pattern: drop control characters (a NUL byte makes Postgres reject the
 * whole query with an encoding error) and escape the wildcards so a search for "100%" doesn't match everything.
 */
export function escapeLike(input: string): string {
  return input.replace(CONTROL, "").replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** A stable fingerprint for duplicate detection ("same message again and again"). */
export function fingerprint(text: string): string {
  return fold(text).replace(/ /g, "").slice(0, 400);
}

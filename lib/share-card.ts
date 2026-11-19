// Native-Canvas drawing for the Student Edition story card (9:16) and the spoof Certificate of Delusion.
// Everything here is client-side and dependency-free. Nothing touches `document` or `window` at import time,
// so the pure helpers (wrapText, fitText, links, name cleaning) run in Node tests.

import { site } from "./site";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;
export const CERT_WIDTH = 1754;
export const CERT_HEIGHT = 1240;
// The rotated "100% DELULU" stamp spans about x 1260-1658 and y 420-620 (inside the inner border, clear of the title);
// the name block must end before its left edge, so it is capped at NAME_MAX_WIDTH around the page centre.
const STAMP_CENTER_X = CERT_WIDTH - 295;
const STAMP_CENTER_Y = 520;
export const NAME_MAX_WIDTH = 740;
// Small enough that 30 of the widest letters ("W", ~0.82em in Anton) still fit NAME_MAX_WIDTH without an ellipsis.
export const NAME_MIN_SIZE = 26;

export const WATERMARK = `${site.url.replace(/^https?:\/\//, "")} | ${site.handle}`;
export const CARD_FINE_PRINT = "Student Edition · comedy only · not a real academic assessment";
export const CERT_FINE_PRINT = "Not an official document. Not recognised by any school, board or exam authority. Pure comedy.";

const INK = "#0b0b0f";
const PAPER = "#fffdf5";
const SUN = "#ffe11a";
const HOT = "#ff2d87";
const VOLT = "#2b4dff";

export type MeasureFn = (text: string, fontSize: number) => number;

/** Word-wraps `text` to `maxWidth`. Words wider than a line are split. */
export function wrapText(text: string, maxWidth: number, fontSize: number, measure: MeasureFn): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  const push = () => {
    if (line) lines.push(line);
    line = "";
  };
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, fontSize) <= maxWidth) {
      line = candidate;
      continue;
    }
    push();
    if (measure(word, fontSize) <= maxWidth) {
      line = word;
      continue;
    }
    // A single word is too wide: break it by characters.
    let chunk = "";
    for (const ch of Array.from(word)) {
      if (chunk && measure(chunk + ch, fontSize) > maxWidth) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    line = chunk;
  }
  push();
  return lines;
}

/** The largest font size (down to `minSize`) at which `text` fits in `maxLines`; truncates with an ellipsis at the minimum. */
export function fitText(
  text: string,
  maxWidth: number,
  maxLines: number,
  startSize: number,
  minSize: number,
  measure: MeasureFn,
): { size: number; lines: string[] } {
  for (let size = startSize; size >= minSize; size -= 2) {
    const lines = wrapText(text, maxWidth, size, measure);
    if (lines.length <= maxLines) return { size, lines };
  }
  const lines = wrapText(text, maxWidth, minSize, measure).slice(0, maxLines);
  if (lines.length) {
    let last = lines[lines.length - 1].replace(/[\s.,;:!?]+$/, "");
    while (last && measure(`${last}…`, minSize) > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last}…`;
  }
  return { size: minSize, lines };
}

export type CardData = { pct: number; rank: string; diagnosis: string };
export type CardFonts = { display: string; marker: string; sans: string };

export const FALLBACK_FONTS: CardFonts = {
  display: "Impact, 'Arial Narrow', sans-serif",
  marker: "'Comic Sans MS', cursive",
  sans: "system-ui, -apple-system, sans-serif",
};

const font = (family: string, size: number, weight = "400") => `${weight} ${size}px ${family}`;

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, shadow = 14, border = 8) {
  ctx.fillStyle = INK;
  ctx.fillRect(x + shadow, y + shadow, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = border;
  ctx.strokeStyle = INK;
  ctx.strokeRect(x, y, w, h);
}

function centeredLines(ctx: CanvasRenderingContext2D, lines: string[], cx: number, y: number, lineHeight: number) {
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
}

/** Draws the 1080x1920 story card. */
export function drawCard(ctx: CanvasRenderingContext2D, data: CardData, fonts: CardFonts = FALLBACK_FONTS): void {
  const W = CARD_WIDTH;
  const H = CARD_HEIGHT;
  const cx = W / 2;
  const measureWith = (family: string, weight = "400"): MeasureFn => (t, size) => {
    ctx.font = font(family, size, weight);
    return ctx.measureText(t).width;
  };

  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";

  // background + dots
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(11,11,15,0.09)";
  for (let y = 40; y < H; y += 60) for (let x = 40; x < W; x += 60) ctx.fillRect(x, y, 6, 6);

  // header band
  ctx.fillStyle = SUN;
  ctx.fillRect(0, 0, W, 300);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 300, W, 10);
  ctx.fillStyle = INK;
  ctx.font = font(fonts.display, 120);
  ctx.fillText("GRADE DELUSION™", cx, 190);

  // student edition badge
  ctx.save();
  ctx.translate(cx, 372);
  ctx.rotate(-0.04);
  box(ctx, -250, -50, 500, 100, HOT, 10, 6);
  ctx.fillStyle = PAPER;
  ctx.font = font(fonts.display, 58);
  ctx.fillText("STUDENT EDITION", 0, 20);
  ctx.restore();

  // label
  ctx.fillStyle = INK;
  ctx.font = font(fonts.sans, 44, "700");
  ctx.fillText("MY DELUSION LEVEL", cx, 490);

  // big percentage (hard shadow + fill), shrunk if needed so "100%" never touches the edges
  const pctText = `${Math.round(data.pct)}%`;
  const pctFit = fitText(pctText, 900, 1, 470, 200, measureWith(fonts.display));
  const pctBase = 535 + pctFit.size * 0.87;
  ctx.font = font(fonts.display, pctFit.size);
  ctx.fillStyle = INK;
  ctx.fillText(pctText, cx + 14, pctBase + 14);
  ctx.fillStyle = HOT;
  ctx.fillText(pctText, cx, pctBase);
  ctx.lineWidth = 10;
  ctx.strokeStyle = INK;
  ctx.strokeText(pctText, cx, pctBase);

  // rank sticker
  const rank = fitText(data.rank.toUpperCase(), 820, 3, 92, 52, measureWith(fonts.display));
  const rankH = rank.lines.length * rank.size * 1.12 + 70;
  const rankY = Math.max(1010, pctBase + 70);
  box(ctx, 90, rankY, W - 180, rankH, SUN, 14, 8);
  ctx.fillStyle = INK;
  ctx.font = font(fonts.display, rank.size);
  centeredLines(ctx, rank.lines, cx, rankY + 38 + rank.size * 0.95, rank.size * 1.12);

  // diagnosis card
  const diagY = rankY + rankH + 55;
  const diagBottom = 1700;
  const diagMeasure = measureWith(fonts.marker);
  // Largest font size at which the wrapped diagnosis fits the space that is left (padding 90px, line height 1.28).
  let diag = { size: 30, lines: wrapText(data.diagnosis, 800, 30, diagMeasure) };
  for (let size = 54; size >= 30; size -= 2) {
    const lines = wrapText(data.diagnosis, 800, size, diagMeasure);
    if (lines.length * size * 1.28 + 90 <= diagBottom - diagY) {
      diag = { size, lines };
      break;
    }
  }
  const diagH = Math.min(diagBottom - diagY, diag.lines.length * diag.size * 1.28 + 90);
  box(ctx, 90, diagY, W - 180, diagH, "#ffffff", 14, 8);
  ctx.fillStyle = INK;
  ctx.font = font(fonts.marker, diag.size);
  centeredLines(ctx, diag.lines, cx, diagY + 45 + diag.size, diag.size * 1.28);

  // footer
  ctx.fillStyle = INK;
  ctx.fillRect(0, 1730, W, H - 1730);
  ctx.fillStyle = SUN;
  const wm = fitText(WATERMARK, W - 120, 1, 50, 30, measureWith(fonts.sans, "700"));
  ctx.font = font(fonts.sans, wm.size, "700");
  ctx.fillText(wm.lines[0] ?? WATERMARK, cx, 1815);
  ctx.fillStyle = "rgba(255,253,245,0.75)";
  const fine = fitText(CARD_FINE_PRINT, W - 120, 1, 30, 20, measureWith(fonts.sans));
  ctx.font = font(fonts.sans, fine.size);
  ctx.fillText(fine.lines[0] ?? CARD_FINE_PRINT, cx, 1868);

  // frame
  ctx.lineWidth = 16;
  ctx.strokeStyle = INK;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  ctx.restore();
}

/** Trims, collapses whitespace, removes control characters and caps the length (in characters). */
export function cleanName(raw: string, max = 30): string {
  const spaced = Array.from(raw, (ch) => (isInvisible(ch.codePointAt(0) ?? 0) ? " " : ch)).join("");
  const cleaned = Array.from(spaced.replace(/\s+/g, " ").trim()).slice(0, max).join("").trim();
  return cleaned || "Anonymous Legend";
}

/** Control, zero-width and bidirectional-override characters, which have no place in a name on a certificate. */
function isInvisible(cp: number): boolean {
  return (
    cp <= 0x1f ||
    (cp >= 0x7f && cp <= 0x9f) ||
    (cp >= 0x200b && cp <= 0x200f) ||
    (cp >= 0x2028 && cp <= 0x202e) ||
    (cp >= 0x2066 && cp <= 0x2069) ||
    cp === 0xfeff
  );
}

export type CertificateData = { name: string; excuse: string; issuedOn: string };

/** Draws the 1754x1240 (A4 landscape) spoof certificate. */
export function drawCertificate(ctx: CanvasRenderingContext2D, data: CertificateData, fonts: CardFonts = FALLBACK_FONTS): void {
  const W = CERT_WIDTH;
  const H = CERT_HEIGHT;
  const cx = W / 2;
  const measureWith = (family: string, weight = "400"): MeasureFn => (t, size) => {
    ctx.font = font(family, size, weight);
    return ctx.measureText(t).width;
  };
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = SUN;
  ctx.fillRect(40, 40, W - 80, H - 80);
  ctx.fillStyle = PAPER;
  ctx.fillRect(80, 80, W - 160, H - 160);
  ctx.lineWidth = 10;
  ctx.strokeStyle = INK;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.lineWidth = 4;
  ctx.strokeRect(80, 80, W - 160, H - 160);

  ctx.fillStyle = INK;
  ctx.font = font(fonts.sans, 34, "700");
  ctx.fillText("GRADE DELUSION™ · ACADEMIC DELUSION BOARD*", cx, 190);

  ctx.font = font(fonts.display, 150);
  ctx.fillStyle = INK;
  ctx.fillText("CERTIFICATE OF DELUSION", cx + 6, 356);
  ctx.fillStyle = HOT;
  ctx.fillText("CERTIFICATE OF DELUSION", cx, 350);

  ctx.fillStyle = INK;
  ctx.font = font(fonts.marker, 48);
  ctx.fillText("This is to certify that", cx, 460);

  // Kept narrower than the page so even a 30-letter name never runs under the stamp (STAMP_LEFT_EDGE).
  const name = fitText(data.name, NAME_MAX_WIDTH, 1, 130, NAME_MIN_SIZE, measureWith(fonts.display));
  ctx.font = font(fonts.display, name.size);
  ctx.fillStyle = VOLT;
  ctx.fillText(name.lines[0] ?? "", cx, 600);
  ctx.fillStyle = INK;
  ctx.fillRect(cx - 520, 625, 1040, 6);

  ctx.font = font(fonts.marker, 48);
  ctx.fillText("has officially declared, with full confidence:", cx, 720);

  const excuse = fitText(`“${data.excuse}”`, W - 440, 2, 76, 44, measureWith(fonts.display));
  ctx.font = font(fonts.display, excuse.size);
  centeredLines(ctx, excuse.lines, cx, 835, excuse.size * 1.15);

  ctx.font = font(fonts.sans, 34, "700");
  ctx.fillText(`Issued ${data.issuedOn} · ${WATERMARK}`, cx, 1000);

  // stamp
  ctx.save();
  ctx.translate(STAMP_CENTER_X, STAMP_CENTER_Y);
  ctx.rotate(-0.22);
  ctx.lineWidth = 8;
  ctx.strokeStyle = HOT;
  ctx.strokeRect(-190, -62, 380, 124);
  ctx.fillStyle = HOT;
  ctx.font = font(fonts.display, 58);
  ctx.fillText("100% DELULU", 0, 20);
  ctx.restore();

  ctx.fillStyle = "rgba(11,11,15,0.7)";
  const fine = fitText(CERT_FINE_PRINT, W - 360, 1, 28, 18, measureWith(fonts.sans));
  ctx.font = font(fonts.sans, fine.size);
  ctx.fillText(fine.lines[0] ?? CERT_FINE_PRINT, cx, 1120);
  ctx.restore();
}

// ---- share links ------------------------------------------------------------------------------------------

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function telegramUrl(text: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

// ---- browser-only helpers (touch `document` only when called) --------------------------------------------

/** Resolved font stacks from the site's next/font CSS variables, loaded before drawing so canvas never falls back mid-render. */
export async function loadCardFonts(): Promise<CardFonts> {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => {
    const v = style.getPropertyValue(name).trim();
    return v ? `${v}, ${fallback}` : fallback;
  };
  const fonts: CardFonts = {
    display: read("--nf-anton", FALLBACK_FONTS.display),
    marker: read("--nf-marker", FALLBACK_FONTS.marker),
    sans: read("--nf-grotesk", FALLBACK_FONTS.sans),
  };
  try {
    await Promise.all([
      document.fonts.load(font(fonts.display, 100), "0123456789%GRADE"),
      document.fonts.load(font(fonts.marker, 50), "abc"),
      document.fonts.load(font(fonts.sans, 40, "700"), "abc"),
      document.fonts.load(font(fonts.sans, 40), "abc"),
    ]);
  } catch {
    /* fall back to whatever is available */
  }
  return fonts;
}

export type RenderedImage = { dataUrl: string; blob: Blob | null };

async function render(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): Promise<RenderedImage> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  draw(ctx);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return { dataUrl: canvas.toDataURL("image/png"), blob };
}

export async function renderCard(data: CardData): Promise<RenderedImage> {
  const fonts = await loadCardFonts();
  return render(CARD_WIDTH, CARD_HEIGHT, (ctx) => drawCard(ctx, data, fonts));
}

export async function renderCertificate(data: CertificateData): Promise<RenderedImage> {
  const fonts = await loadCardFonts();
  return render(CERT_WIDTH, CERT_HEIGHT, (ctx) => drawCertificate(ctx, data, fonts));
}

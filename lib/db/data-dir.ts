import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Everything generated locally (PGlite database, dev e-mail outbox, test output) lives in .data/,
 * which contains its own `.gitignore` so it can never be committed, whatever the repo's ignore rules are.
 */
export function ensureDataDir(dir = ".data"): string {
  const abs = path.resolve(/*turbopackIgnore: true*/ process.cwd(), dir);
  mkdirSync(abs, { recursive: true });
  const ignore = path.join(abs, ".gitignore");
  if (!existsSync(ignore)) writeFileSync(ignore, "*\n");
  return abs;
}

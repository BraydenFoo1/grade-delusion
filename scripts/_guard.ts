// Shared safety rails for the command-line scripts.
//
// Scripts never read .env.local on their own. They use the DATABASE_URL in the environment you give them,
// and if that is a REMOTE database they refuse to do anything until you repeat the host name with
// --confirm. Running something against production is therefore always a deliberate, typed-out act.

import { databaseUrl, pgliteDir } from "../lib/env";

export function flag(name: string): boolean {
  return process.argv.includes(name);
}

export function option(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Positional arguments (anything that isn't a --flag or the value of --confirm). */
export function positionals(): string[] {
  const args = process.argv.slice(2);
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--confirm") i++;
    else if (!args[i].startsWith("--")) out.push(args[i]);
  }
  return out;
}

/** Returns a description of the target; exits the process if a remote target isn't confirmed. */
export function requireConfirmedTarget(action: string): string {
  const url = databaseUrl();
  if (!url) return `the local embedded database (${pgliteDir()})`;
  const host = new URL(url).host;
  if (option("--confirm") !== host) {
    console.error(
      `\nRefusing to ${action} on REMOTE database ${host}.\n` +
        `If that is really what you want, run the same command again with:  --confirm ${host}\n`,
    );
    process.exit(2);
  }
  return `remote database ${host}`;
}

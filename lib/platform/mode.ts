// Release mode: is this the PUBLIC BETA (read-only, no accounts, no participation) or the full platform?
//
// Fail-closed by construction:
//  - every deployed build (production AND Vercel preview) is the public beta;
//  - there is NO environment variable that switches a deployed build to the full platform;
//  - the full platform exists only in `next dev`, in tests, and in the local end-to-end build
//    (GD_LOCAL=1, never on Vercel, and only when the site URL is a loopback address).
// Enabling accounts on a deployed site later needs a reviewed code change (and the Kai age gate), not a setting.

import { isLocalOverride } from "../env";

function isLoopback(url: string | undefined): boolean {
  try {
    const host = new URL(url ?? "").hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  } catch {
    return false;
  }
}

export function isPublicBeta(): boolean {
  if (process.env.NODE_ENV !== "production") return false; // next dev, vitest
  if (isLocalOverride() && isLoopback(process.env.BETTER_AUTH_URL)) return false; // local e2e build only
  return true;
}

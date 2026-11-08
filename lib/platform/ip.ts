/**
 * Rate-limit bucket for a client IP. When no IP header is present (local development, or a proxy that doesn't
 * set one) every visitor would otherwise share ONE bucket and lock each other out, so the unknown bucket gets a
 * much larger allowance. Real per-IP limits apply on Vercel, which always sets the header.
 */
export function ipBucket(ip: string, perIp: number): { key: string; limit: number } {
  return ip === "unknown" ? { key: "unknown", limit: perIp * 10 } : { key: ip, limit: perIp };
}

import { createHash } from "node:crypto";

/**
 * Rate-limit keys are stored in the database, so raw IPs and e-mail addresses must not appear in them.
 * A keyed hash keeps buckets stable while making the table useless as a list of who visited.
 */
export function keyHash(value: string, secret: string): string {
  return createHash("sha256").update(`${secret}:${value}`).digest("hex").slice(0, 32);
}

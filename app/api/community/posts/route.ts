import { clientIp } from "@/lib/actions/run";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { feedQuery, parse } from "@/lib/platform/validation";
import { AppError, logUnexpected } from "@/lib/platform/errors";
import { authSecret } from "@/lib/env";
import { isPublicBeta } from "@/lib/platform/mode";
import { ipBucket, keyHash } from "@/lib/platform/ip";
import { publicFeed } from "@/lib/services/public-read";
import { consumeRateLimit } from "@/lib/services/rate-limit";

// Public, read-only feed of APPROVED posts. Never cached by shared caches in the full platform, because a removed
// post must disappear immediately. In the public beta it serves static, reviewed content (no database), so a short
// shared cache is fine.
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const betaHeaders = { "Cache-Control": "public, max-age=60, s-maxage=60", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  try {
    const query = parse(feedQuery, Object.fromEntries(new URL(request.url).searchParams));
    if (isPublicBeta()) return Response.json(await publicFeed(query), { headers: betaHeaders });
    const db = await getDb();
    const ip = ipBucket(clientIp(request.headers), 120);
    const limit = await consumeRateLimit(db, `feed-ip:${keyHash(ip.key, authSecret())}`, ip.limit, 60);
    if (!limit.allowed) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests. Slow down a little." } },
        { status: 429, headers: { ...headers, "Retry-After": String(limit.retryAfterSec) } },
      );
    }
    const actor = await getActor();
    const result = await publicFeed(query, { viewerId: actor?.id });
    return Response.json(result, { headers });
  } catch (err) {
    if (err instanceof AppError && err.code === "VALIDATION") {
      return Response.json({ error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } }, { status: 400, headers });
    }
    logUnexpected("[api] GET /api/community/posts:", err);
    return Response.json({ error: { code: "INTERNAL", message: "Something went wrong." } }, { status: 500, headers });
  }
}

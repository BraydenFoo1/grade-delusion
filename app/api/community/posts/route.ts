import { clientIp } from "@/lib/actions/run";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { feedQuery, parse } from "@/lib/platform/validation";
import { AppError, logUnexpected } from "@/lib/platform/errors";
import { authSecret } from "@/lib/env";
import { ipBucket, keyHash } from "@/lib/platform/ip";
import { listPublicPosts } from "@/lib/services/posts";
import { consumeRateLimit } from "@/lib/services/rate-limit";

// Public, read-only feed of APPROVED posts. Never cached by shared caches, because a removed post
// must disappear immediately.
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  try {
    const query = parse(feedQuery, Object.fromEntries(new URL(request.url).searchParams));
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
    const result = await listPublicPosts(db, query, { viewerId: actor?.id });
    return Response.json(result, { headers });
  } catch (err) {
    if (err instanceof AppError && err.code === "VALIDATION") {
      return Response.json({ error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } }, { status: 400, headers });
    }
    logUnexpected("[api] GET /api/community/posts:", err);
    return Response.json({ error: { code: "INTERNAL", message: "Something went wrong." } }, { status: 500, headers });
  }
}

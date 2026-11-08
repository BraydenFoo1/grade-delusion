import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { isPublicBeta } from "@/lib/platform/mode";

// Better Auth's HTTP API (sign-in, sign-out, verify-email, password reset…).
// Routes that we don't want exposed are disabled in lib/auth/create.ts (DISABLED_PATHS).
export const dynamic = "force-dynamic";

async function handlers() {
  return toNextJsHandler(await getAuth());
}

// Public beta: the whole auth API is off (sign-in, password reset, verification, delete-user...). Checked before
// getAuth(), so it needs no database, secrets or e-mail configuration.
const notFound = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  if (isPublicBeta()) return notFound();
  return (await handlers()).GET(request);
}

export async function POST(request: Request) {
  if (isPublicBeta()) return notFound();
  return (await handlers()).POST(request);
}

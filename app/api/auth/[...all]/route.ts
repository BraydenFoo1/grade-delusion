import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

// Better Auth's HTTP API (sign-in, sign-out, verify-email, password reset…).
// Routes that we don't want exposed are disabled in lib/auth/create.ts (DISABLED_PATHS).
export const dynamic = "force-dynamic";

async function handlers() {
  return toNextJsHandler(await getAuth());
}

export async function GET(request: Request) {
  return (await handlers()).GET(request);
}

export async function POST(request: Request) {
  return (await handlers()).POST(request);
}

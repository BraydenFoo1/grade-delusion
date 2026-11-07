import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { unreadCount } from "@/lib/services/notifications";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

/** The signed-in user's unread-notification count (drives the bell in the navigation). */
export async function GET() {
  const actor = await getActor();
  if (!actor) return Response.json({ error: { code: "UNAUTHENTICATED", message: "Sign in first." } }, { status: 401, headers });
  const count = await unreadCount(await getDb(), actor.id);
  return Response.json({ count }, { headers });
}

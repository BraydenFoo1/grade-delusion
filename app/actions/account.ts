"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { clientIp, run } from "@/lib/actions/run";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { type ActionResult, AppError, fail, ok } from "@/lib/platform/errors";
import { authSecret } from "@/lib/env";
import { ipBucket, keyHash } from "@/lib/platform/ip";
import { parse, signUpInput } from "@/lib/platform/validation";
import { assertRateLimit } from "@/lib/services/rate-limit";
import { getSettings } from "@/lib/services/settings";
import { assertNameAllowed, updateProfile } from "@/lib/services/users";

/**
 * Registration. Better Auth's own /sign-up/email route is disabled, so every account passes through here:
 * honeypot, registration switch, IP + per-address throttles, 13+ and terms, display-name rules.
 * The response is identical for new and existing addresses (the owner of an existing address gets an e-mail).
 */
export async function signUpAction(input: unknown): Promise<ActionResult> {
  try {
    // Bots fill every field. Pretend it worked and do nothing.
    if (typeof input === "object" && input && "website" in input && (input as { website?: unknown }).website) return ok();

    const data = parse(signUpInput, input);
    const db = await getDb();
    const h = await headers();

    const settings = await getSettings(db);
    if (!settings.registrationOpen) throw new AppError("UNAVAILABLE", "Sign-ups are closed right now. Check back soon.");

    const ip = ipBucket(clientIp(h), 6);
    await assertRateLimit(db, `signup-ip:${keyHash(ip.key, authSecret())}`, ip.limit, 3600, "Signing up");
    await assertRateLimit(db, `signup-email:${keyHash(data.email, authSecret())}`, 3, 3600, "Signing up with that address");
    await assertNameAllowed(db, data.name);

    const auth = await getAuth();
    try {
      // After they click the e-mailed link they land signed in on their dashboard.
      await auth.api.signUpEmail({
        body: { name: data.name, email: data.email, password: data.password, callbackURL: "/dashboard?welcome=1" },
        headers: h,
      });
    } catch (err) {
      if (err instanceof APIError && err.statusCode === 400) {
        throw new AppError("VALIDATION", err.body?.message ?? "Please check what you entered.");
      }
      throw err;
    }
    return ok();
  } catch (err) {
    return fail(err);
  }
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const res = await run("participant", async ({ db, actor }) => updateProfile(db, actor, input));
  if (res.ok) revalidatePath("/settings");
  return res;
}

// Make an existing, e-mail-confirmed member an admin: the bootstrap for the very first admin.
//
//   Local:   npm run admin:promote -- you@example.com
//   Remote:  DATABASE_URL="postgres://..." npm run admin:promote -- you@example.com --confirm <host>
//
// The person must already have signed up and confirmed their e-mail. The change is written to the audit log.
// Further role changes are made by admins in the app (Admin → Users → the person → Role).

import { eq } from "drizzle-orm";
import { connectDb } from "../lib/db/connect";
import { user } from "../lib/db/schema";
import { recordAudit } from "../lib/services/audit";
import { positionals, requireConfirmedTarget } from "./_guard";

const [email] = positionals();
if (!email) {
  console.error("Usage: npm run admin:promote -- <email> [--confirm <host>]");
  process.exit(2);
}
const target = requireConfirmedTarget("promote an admin");

async function main() {
  const { db, close } = await connectDb();
  try {
    const [u] = await db
      .select({ id: user.id, role: user.role, emailVerified: user.emailVerified, name: user.name })
      .from(user)
      .where(eq(user.email, email.trim().toLowerCase()))
      .limit(1);
    if (!u) throw new Error(`No account with that e-mail on ${target}. Sign up in the app first.`);
    if (!u.emailVerified) throw new Error("That account hasn't confirmed its e-mail yet. Ask them to click the link first.");
    if (u.role === "admin") {
      console.log(`${u.name} is already an admin. Nothing to do.`);
      return;
    }
    await db.transaction(async (tx) => {
      await tx.update(user).set({ role: "admin" }).where(eq(user.id, u.id));
      await recordAudit(tx, { action: "user.role_changed", targetType: "user", targetId: u.id, details: { from: u.role, to: "admin", via: "cli" } });
    });
    console.log(`${u.name} is now an admin on ${target}.`);
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

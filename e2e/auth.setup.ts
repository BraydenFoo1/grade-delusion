import { expect, test as setup } from "@playwright/test";
import { E2E_USERS } from "./constants";
import { authState, signIn } from "./helpers";

// Sign each seeded account in ONCE through the real sign-in form and keep the browser state, so the other
// specs start already signed in as an admin, a moderator or a member.
for (const u of E2E_USERS) {
  setup(`sign in as ${u.key}`, async ({ page }) => {
    await signIn(page, u.email);
    await expect(page).toHaveURL(/\/dashboard/);
    await page.context().storageState({ path: authState(u.key) });
  });
}

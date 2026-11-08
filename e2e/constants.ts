// Shared by the seed script (scripts/e2e-seed.ts) and the Playwright specs.
export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_PASSWORD = "E2e-correct-horse-battery!";
export const E2E_OUTBOX = ".data/e2e-outbox";
export const E2E_AUTH_DIR = ".data/e2e-auth";
export const E2E_SHOTS = ".data/e2e-shots";

export const E2E_USERS = [
  { key: "admin", name: "Ada Admin", email: "admin@e2e.test", role: "admin" },
  { key: "mod", name: "Max Moderator", email: "mod@e2e.test", role: "moderator" },
  { key: "fan", name: "Fiona Fan", email: "fan@e2e.test", role: "user" },
] as const;
export type E2EUserKey = (typeof E2E_USERS)[number]["key"];

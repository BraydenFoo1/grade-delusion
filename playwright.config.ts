import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_OUTBOX, E2E_PORT } from "./e2e/constants";

// End-to-end tests run against a PRODUCTION BUILD (`npm run build` first) served on port 3100 with a
// throwaway on-disk database in .data/e2e-db (seeded by scripts/e2e-seed.ts before the server starts) and
// the development e-mail outbox. DATABASE_URL and RESEND_API_KEY are blanked so nothing can reach a real
// database or send real e-mail, whatever is in .env.local. Uses the installed Google Chrome (no download).
export default defineConfig({
  testDir: "./e2e",
  outputDir: ".data/e2e-results",
  fullyParallel: false,
  workers: 1, // one server, one database: tests share state on purpose (a signed-up user, a moderated post…)
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: { baseURL: E2E_BASE_URL, trace: "off", screenshot: "off" },
  webServer: {
    command: `npx tsx scripts/e2e-seed.ts && npx next start -p ${E2E_PORT}`,
    url: `${E2E_BASE_URL}/api/auth/ok`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      GD_LOCAL: "1",
      DATABASE_URL: "",
      RESEND_API_KEY: "",
      GD_PGLITE_DIR: ".data/e2e-db",
      GD_OUTBOX_DIR: E2E_OUTBOX,
      BETTER_AUTH_URL: E2E_BASE_URL,
      GD_RATE_LIMIT: "0",
      PORT: String(E2E_PORT),
    },
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/, use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "chrome", dependencies: ["setup"], testIgnore: /auth\.setup\.ts/, use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
});

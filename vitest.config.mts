import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      // `server-only` throws outside Next's server bundle; tests run on the server, so stub it.
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Each file boots its own in-memory Postgres (PGlite) and applies the real migrations.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: "forks",
    env: {
      // Never let a developer's .env.local point the tests at a real database.
      DATABASE_URL: "",
      RESEND_API_KEY: "",
      NODE_ENV: "test",
    },
  },
});

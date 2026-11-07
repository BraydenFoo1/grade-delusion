import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` only reads the schema, so no database credentials are needed.
// Migrations are applied with `npm run db:migrate` (scripts/migrate.ts), never automatically on deploy.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
});

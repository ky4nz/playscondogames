import { defineConfig } from "drizzle-kit";

// Config untuk deploy (Vercel/Neon): URL diambil dari env DATABASE_URL.
// Dipakai dengan:  DATABASE_URL="..." npx drizzle-kit push --config=drizzle.config.ts
// File drizzle.config.json tetap ada untuk database lokal sandbox.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});

import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Prisma CLI doesn't read .env.local by itself, only .env. Use Next.js's
// own env loader so `prisma migrate` and `prisma db seed` see the same
// vars the app sees at runtime.
loadEnvConfig(process.cwd());

// `prisma migrate` / `db push` / `db pull` run DDL, which the Supabase
// transaction pooler (DATABASE_URL, port 6543) can't execute — they need the
// direct connection (DIRECT_URL, port 5432). Fall back to DATABASE_URL for
// setups without a separate pooler. Only the Prisma CLI reads this config; the
// runtime client uses DATABASE_URL directly (lib/db/client.ts).
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!migrationUrl) {
  throw new Error(
    "Neither DIRECT_URL nor DATABASE_URL is set. Copy .env.example to .env.local and fill in your Supabase connection strings.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: migrationUrl },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});

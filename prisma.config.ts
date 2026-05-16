import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Prisma CLI doesn't read .env.local by itself, only .env. Use Next.js's
// own env loader so `prisma migrate` and `prisma db seed` see the same
// vars the app sees at runtime.
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Supabase connection strings.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: databaseUrl },
  migrations: { path: "prisma/migrations" },
});

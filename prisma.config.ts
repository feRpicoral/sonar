import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Prisma CLI doesn't read .env.local by itself, only .env. Use Next.js's
// own env loader so `prisma migrate` and `prisma db seed` see the same
// vars the app sees at runtime.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder",
  },
  migrations: {
    path: "prisma/migrations",
  },
});

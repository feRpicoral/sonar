import { defineConfig } from "prisma/config";

// Datasource URL lives here in Prisma 7 (no longer in schema.prisma). The
// runtime client uses a separate adapter in lib/db/client.ts; this config is
// for the Prisma CLI (migrate, studio, db push).
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder",
  },
  migrations: {
    path: "prisma/migrations",
  },
});

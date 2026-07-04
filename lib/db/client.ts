import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Lazy singleton so build never fails when DATABASE_URL is absent. The first
// query at request time instantiates the client and caches it on globalThis so
// every request reuses one PrismaClient (and one pg pool). Caching in production
// too is essential: without it each getPrisma() call would open a new pool and
// exhaust the database connection limit. globalThis (rather than a module
// constant) also lets the instance survive HMR in dev.

declare global {
  var __sonarPrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill in Supabase keys.",
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter, log: ["warn", "error"] });
}

export function getPrisma(): PrismaClient {
  if (globalThis.__sonarPrisma) return globalThis.__sonarPrisma;
  const client = createClient();
  globalThis.__sonarPrisma = client;
  return client;
}

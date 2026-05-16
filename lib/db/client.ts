import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Lazy singleton so build never fails when DATABASE_URL is absent. The first
// query at request time instantiates the client and (in dev) caches it on
// globalThis to survive HMR.

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
  if (process.env.NODE_ENV !== "production") {
    globalThis.__sonarPrisma = client;
  }
  return client;
}

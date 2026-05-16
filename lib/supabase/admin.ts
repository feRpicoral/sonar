import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See .env.example.`);
  return value;
}

/**
 * Privileged Supabase client for app_metadata updates and admin operations.
 * Service-role key is required - only use from trusted server contexts
 * (Server Actions, Route Handlers, Inngest functions). Never import from
 * client components.
 */
export function createAdminSupabase() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

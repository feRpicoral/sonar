import { z } from "zod";

/**
 * Read a required environment variable, throwing a consistent error if unset.
 * Single source of truth - replaces the copies that were duplicated across
 * lib/supabase/*, lib/billing/stripe, lib/transcription/whisper, and the Stripe
 * route. Use for feature-gated vars (Stripe, Groq, Tavily, Resend, ...) that are
 * only needed when a given feature runs.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See .env.example.`);
  return value;
}

// Always-required core: without these the app cannot serve a single request.
// Feature-gated vars are validated on first use via requireEnv, not here.
const coreEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

/**
 * Validate the core environment at server boot (called from instrumentation's
 * `register`) so a misconfigured deploy fails fast with a clear message instead
 * of throwing deep inside an unrelated request.
 */
export function validateServerEnv(): void {
  const result = coreEnvSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")} (${issue.message})`)
      .join(", ");
    throw new Error(`Invalid or missing required environment variables: ${problems}`);
  }
}

import { createHash, randomBytes } from "crypto";

const KEY_PREFIX = "sk_";

/**
 * Generate a new API key (the plaintext value shown to the user once).
 * Format: `sk_<base64url(32 bytes)>` - ~43 chars after prefix.
 */
export function generateApiKey(): { plaintext: string; last4: string } {
  const raw = randomBytes(32).toString("base64url");
  const plaintext = `${KEY_PREFIX}${raw}`;
  return { plaintext, last4: plaintext.slice(-4) };
}

/**
 * Hash an API key for storage / verification. SHA-256 is adequate for
 * high-entropy random tokens - bcrypt-style slow hashes are aimed at low-
 * entropy human passwords.
 */
export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export const VALID_SCOPES = ["leads:read", "leads:write", "runs:read", "runs:write"] as const;

export type ApiKeyScope = (typeof VALID_SCOPES)[number];

export const SCOPE_LABELS: Record<ApiKeyScope, string> = {
  "leads:read": "Read leads and timeline",
  "leads:write": "Create / update leads",
  "runs:read": "Read agent runs and outputs",
  "runs:write": "Start agent runs",
};

export function isValidScope(s: string): s is ApiKeyScope {
  return (VALID_SCOPES as readonly string[]).includes(s);
}

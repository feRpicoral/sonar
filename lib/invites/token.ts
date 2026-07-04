import { createHash, randomBytes } from "crypto";

// Invite tokens are bearer credentials. Only a SHA-256 digest is persisted; the
// raw token exists only in the invite URL handed out at creation time, so a
// database read never yields a usable token. SHA-256 (unsalted) is adequate for
// high-entropy random tokens - the same rationale as api-keys/crypto.ts.
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

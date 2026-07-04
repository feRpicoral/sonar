import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Webhook signing secrets must be recoverable (they sign every delivery), so
// they are encrypted at rest with AES-256-GCM rather than hashed. Stored form:
//   enc:v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>
// Values without the prefix are treated as legacy plaintext so pre-existing
// rows keep working until they are rotated.
const ENC_PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

function loadKey(): Buffer {
  const raw = process.env.WEBHOOK_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("WEBHOOK_ENCRYPTION_KEY is not set. See .env.example.");
  }
  // Accept base64 or hex; both must decode to exactly 32 bytes.
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `WEBHOOK_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}). ` +
        "Generate one with: openssl rand -base64 32",
    );
  }
  return key;
}

export function encryptWebhookSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, loadKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptWebhookSecret(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) {
    return stored;
  }
  const [ivB64, tagB64, ctB64] = stored.slice(ENC_PREFIX.length).split(":");
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error("Malformed encrypted webhook secret");
  }
  const decipher = createDecipheriv(ALGORITHM, loadKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString(
    "utf8",
  );
}

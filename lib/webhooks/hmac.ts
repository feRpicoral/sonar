import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const SIGNATURE_HEADER = "X-Sonar-Signature";
const TOLERANCE_SEC = 5 * 60;

export { SIGNATURE_HEADER };

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString("base64url")}`;
}

/**
 * Sign a payload for outbound delivery. Header format:
 *   X-Sonar-Signature: t=<unix>,v1=<sha256_hex>
 * The signed string is `${timestamp}.${rawBody}` — the timestamp prefix
 * prevents replay attacks if a valid payload is captured.
 */
export function signWebhookPayload(
  rawBody: string,
  secret: string,
): {
  header: string;
  timestamp: number;
} {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return {
    header: `t=${timestamp},v1=${signature}`,
    timestamp,
  };
}

/**
 * Verify an incoming signature header (mirror of the outbound format).
 * Used by consumers; we publish a snippet of this in our docs.
 */
export function verifyWebhookSignature(
  rawBody: string,
  header: string,
  secret: string,
): { valid: boolean; reason?: string } {
  const parts = Object.fromEntries(
    header
      .split(",")
      .map((p) => p.split("=") as [string, string])
      .filter(([k, v]) => Boolean(k) && Boolean(v)),
  );

  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!t || !v1) return { valid: false, reason: "Malformed signature header" };

  if (Math.abs(Math.floor(Date.now() / 1000) - t) > TOLERANCE_SEC) {
    return { valid: false, reason: "Timestamp outside 5 minute tolerance window" };
  }

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");

  try {
    const ok = timingSafeEqual(Buffer.from(v1, "hex"), Buffer.from(expected, "hex"));
    return { valid: ok, reason: ok ? undefined : "Signature mismatch" };
  } catch {
    return { valid: false, reason: "Signature length mismatch" };
  }
}

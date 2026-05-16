import { describe, expect, it } from "vitest";

import { generateWebhookSecret, signWebhookPayload, verifyWebhookSignature } from "./hmac";

describe("generateWebhookSecret", () => {
  it("returns a prefixed, high-entropy token", () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_[A-Za-z0-9_-]{40,}$/);
  });

  it("produces unique values on each call", () => {
    const a = generateWebhookSecret();
    const b = generateWebhookSecret();
    expect(a).not.toBe(b);
  });
});

describe("signWebhookPayload / verifyWebhookSignature", () => {
  const secret = "whsec_test_secret";
  const body = JSON.stringify({ type: "lead.created", data: { id: "abc" } });

  it("round-trips a freshly signed payload", () => {
    const { header } = signWebhookPayload(body, secret);
    const result = verifyWebhookSignature(body, header, secret);
    expect(result.valid).toBe(true);
  });

  it("rejects a tampered body", () => {
    const { header } = signWebhookPayload(body, secret);
    const result = verifyWebhookSignature(body + " tampered", header, secret);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/mismatch/i);
  });

  it("rejects a wrong secret", () => {
    const { header } = signWebhookPayload(body, secret);
    const result = verifyWebhookSignature(body, header, "whsec_wrong");
    expect(result.valid).toBe(false);
  });

  it("rejects a stale timestamp outside the tolerance window", () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 10 * 60;
    const header = `t=${oldTimestamp},v1=0000000000000000000000000000000000000000000000000000000000000000`;
    const result = verifyWebhookSignature(body, header, secret);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/tolerance/i);
  });

  it("rejects a malformed header", () => {
    const result = verifyWebhookSignature(body, "garbage", secret);
    expect(result.valid).toBe(false);
  });
});

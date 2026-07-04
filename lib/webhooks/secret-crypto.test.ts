import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { decryptWebhookSecret, encryptWebhookSecret } from "./secret-crypto";

const KEY = Buffer.alloc(32, 7).toString("base64");

describe("webhook secret crypto", () => {
  beforeEach(() => {
    process.env.WEBHOOK_ENCRYPTION_KEY = KEY;
  });

  afterEach(() => {
    delete process.env.WEBHOOK_ENCRYPTION_KEY;
  });

  it("round-trips a secret", () => {
    const secret = "whsec_abc123";
    const stored = encryptWebhookSecret(secret);

    expect(stored).toMatch(/^enc:v1:/);
    expect(stored).not.toContain(secret);
    expect(decryptWebhookSecret(stored)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptWebhookSecret("whsec_x")).not.toBe(encryptWebhookSecret("whsec_x"));
  });

  it("treats a non-prefixed value as legacy plaintext", () => {
    expect(decryptWebhookSecret("whsec_legacy_plain")).toBe("whsec_legacy_plain");
  });

  it("rejects a tampered ciphertext", () => {
    const stored = encryptWebhookSecret("whsec_abc123");
    const tampered = stored.slice(0, -4) + "AAAA";

    expect(() => decryptWebhookSecret(tampered)).toThrow();
  });

  it("throws when the key is missing", () => {
    delete process.env.WEBHOOK_ENCRYPTION_KEY;
    expect(() => encryptWebhookSecret("whsec_x")).toThrow(/WEBHOOK_ENCRYPTION_KEY/);
  });
});

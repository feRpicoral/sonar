import { describe, expect, it } from "vitest";

import { generateApiKey, hashApiKey, isValidScope, VALID_SCOPES } from "./crypto";

describe("generateApiKey", () => {
  it("returns a sk_-prefixed key and exposes the last 4 chars", () => {
    const { plaintext, last4 } = generateApiKey();
    expect(plaintext).toMatch(/^sk_[A-Za-z0-9_-]{40,}$/);
    expect(last4).toBe(plaintext.slice(-4));
    expect(last4).toHaveLength(4);
  });
});

describe("hashApiKey", () => {
  it("is deterministic for the same input", () => {
    const key = "sk_test";
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it("produces different hashes for different keys", () => {
    expect(hashApiKey("sk_a")).not.toBe(hashApiKey("sk_b"));
  });

  it("returns 64-char hex", () => {
    expect(hashApiKey("anything")).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("isValidScope", () => {
  it("recognizes every known scope", () => {
    for (const s of VALID_SCOPES) {
      expect(isValidScope(s)).toBe(true);
    }
  });

  it("rejects unknown scopes", () => {
    expect(isValidScope("leads:admin")).toBe(false);
    expect(isValidScope("")).toBe(false);
    expect(isValidScope("anything")).toBe(false);
  });
});

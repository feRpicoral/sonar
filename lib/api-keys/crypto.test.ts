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

    const first = hashApiKey(key);
    const second = hashApiKey(key);

    expect(first).toBe(second);
  });

  it("produces different hashes for different keys", () => {
    const a = hashApiKey("sk_a");
    const b = hashApiKey("sk_b");

    expect(a).not.toBe(b);
  });

  it("returns 64-char hex", () => {
    const hash = hashApiKey("anything");

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("isValidScope", () => {
  it("recognizes every known scope", () => {
    for (const scope of VALID_SCOPES) {
      const result = isValidScope(scope);

      expect(result).toBe(true);
    }
  });

  it("rejects unknown scopes", () => {
    const unknownScopes = ["leads:admin", "", "anything"];

    for (const scope of unknownScopes) {
      const result = isValidScope(scope);

      expect(result).toBe(false);
    }
  });
});

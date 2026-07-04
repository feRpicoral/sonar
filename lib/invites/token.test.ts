import { describe, expect, it } from "vitest";

import { generateInviteToken, hashInviteToken } from "./token";

describe("invite token", () => {
  it("generates a high-entropy url-safe token", () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(generateInviteToken()).not.toBe(token);
  });

  it("hashes deterministically and does not expose the raw token", () => {
    const raw = generateInviteToken();
    const hash = hashInviteToken(raw);
    expect(hash).toBe(hashInviteToken(raw));
    expect(hash).not.toBe(raw);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

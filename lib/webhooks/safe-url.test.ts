import { describe, expect, it, vi } from "vitest";

import { assertSafeWebhookUrl, UnsafeWebhookUrlError } from "./safe-url";

vi.mock("dns/promises", () => ({
  lookup: vi.fn(async (host: string) => {
    if (host === "example.com") return [{ address: "93.184.216.34", family: 4 }];
    if (host === "internal.corp") return [{ address: "10.0.0.5", family: 4 }];
    if (host === "rebind.test") {
      return [
        { address: "93.184.216.34", family: 4 },
        { address: "127.0.0.1", family: 4 },
      ];
    }
    if (host === "ipv6-public.example") {
      return [{ address: "2606:2800:220:1::6962:c84", family: 6 }];
    }
    if (host === "ipv6-loopback.example") {
      return [{ address: "::1", family: 6 }];
    }
    throw new Error("ENOTFOUND");
  }),
}));

describe("assertSafeWebhookUrl", () => {
  it("accepts an https URL that resolves to a public address", async () => {
    await expect(assertSafeWebhookUrl("https://example.com/hook")).resolves.toBeUndefined();
  });

  it("accepts a public IPv6 literal", async () => {
    await expect(
      assertSafeWebhookUrl("https://[2606:2800:220:1::6962:c84]/hook"),
    ).resolves.toBeUndefined();
  });

  it("rejects non-http(s) protocols", async () => {
    await expect(assertSafeWebhookUrl("file:///etc/passwd")).rejects.toBeInstanceOf(
      UnsafeWebhookUrlError,
    );
    await expect(assertSafeWebhookUrl("ftp://example.com")).rejects.toBeInstanceOf(
      UnsafeWebhookUrlError,
    );
  });

  it("rejects localhost by name", async () => {
    await expect(assertSafeWebhookUrl("http://localhost:3000")).rejects.toThrow(/localhost/);
  });

  it("rejects 127.0.0.1 literal", async () => {
    await expect(assertSafeWebhookUrl("http://127.0.0.1:3000")).rejects.toThrow(/blocked range/);
  });

  it("rejects RFC1918 literals", async () => {
    await expect(assertSafeWebhookUrl("http://10.0.0.1/x")).rejects.toThrow(/blocked range/);
    await expect(assertSafeWebhookUrl("http://192.168.1.1/x")).rejects.toThrow(/blocked range/);
    await expect(assertSafeWebhookUrl("http://172.20.0.1/x")).rejects.toThrow(/blocked range/);
  });

  it("rejects link-local IPv4", async () => {
    await expect(assertSafeWebhookUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow(
      /blocked range/,
    );
  });

  it("rejects IPv6 loopback literal", async () => {
    await expect(assertSafeWebhookUrl("http://[::1]/")).rejects.toThrow(/blocked range/);
  });

  it("rejects IPv6 link-local literal", async () => {
    await expect(assertSafeWebhookUrl("http://[fe80::1]/")).rejects.toThrow(/blocked range/);
  });

  it("rejects IPv6 ULA literal", async () => {
    await expect(assertSafeWebhookUrl("http://[fd00::1]/")).rejects.toThrow(/blocked range/);
  });

  it("rejects IPv4-mapped IPv6 of a private address", async () => {
    await expect(assertSafeWebhookUrl("http://[::ffff:127.0.0.1]/")).rejects.toThrow(
      /blocked range/,
    );
  });

  it("rejects a hostname that resolves into RFC1918", async () => {
    await expect(assertSafeWebhookUrl("https://internal.corp/hook")).rejects.toThrow(
      /blocked range/,
    );
  });

  it("rejects a DNS-rebind hostname (mixed public+loopback records)", async () => {
    await expect(assertSafeWebhookUrl("https://rebind.test/hook")).rejects.toThrow(/blocked range/);
  });

  it("rejects an IPv6 hostname that resolves to loopback", async () => {
    await expect(assertSafeWebhookUrl("https://ipv6-loopback.example/hook")).rejects.toThrow(
      /blocked range/,
    );
  });

  it("rejects unresolvable hostnames", async () => {
    await expect(assertSafeWebhookUrl("https://nope.invalid/hook")).rejects.toThrow(
      /Could not resolve/,
    );
  });

  it("rejects malformed URLs", async () => {
    await expect(assertSafeWebhookUrl("not a url")).rejects.toThrow(/Invalid URL/);
  });
});

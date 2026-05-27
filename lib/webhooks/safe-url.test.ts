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
    const url = "https://example.com/hook";

    const result = assertSafeWebhookUrl(url);

    await expect(result).resolves.toBeUndefined();
  });

  it("accepts a public IPv6 literal", async () => {
    const url = "https://[2606:2800:220:1::6962:c84]/hook";

    const result = assertSafeWebhookUrl(url);

    await expect(result).resolves.toBeUndefined();
  });

  it("rejects non-http(s) protocols", async () => {
    const urls = ["file:///etc/passwd", "ftp://example.com"];

    for (const url of urls) {
      const result = assertSafeWebhookUrl(url);

      await expect(result).rejects.toBeInstanceOf(UnsafeWebhookUrlError);
    }
  });

  it("rejects localhost by name", async () => {
    const url = "http://localhost:3000";

    const result = assertSafeWebhookUrl(url);

    await expect(result).rejects.toThrow(/localhost/);
  });

  it("rejects 127.0.0.1 literal", async () => {
    const url = "http://127.0.0.1:3000";

    const result = assertSafeWebhookUrl(url);

    await expect(result).rejects.toThrow(/blocked range/);
  });

  it("rejects RFC1918 literals", async () => {
    const urls = ["http://10.0.0.1/x", "http://192.168.1.1/x", "http://172.20.0.1/x"];

    for (const url of urls) {
      const result = assertSafeWebhookUrl(url);

      await expect(result).rejects.toThrow(/blocked range/);
    }
  });

  it("rejects link-local IPv4", async () => {
    const url = "http://169.254.169.254/latest/meta-data";

    const result = assertSafeWebhookUrl(url);

    await expect(result).rejects.toThrow(/blocked range/);
  });

  it("rejects IPv6 loopback literal", async () => {
    const url = "http://[::1]/";

    const result = assertSafeWebhookUrl(url);

    await expect(result).rejects.toThrow(/blocked range/);
  });

  it("rejects IPv6 link-local literal", async () => {
    const url = "http://[fe80::1]/";

    const result = assertSafeWebhookUrl(url);

    await expect(result).rejects.toThrow(/blocked range/);
  });

  it("rejects IPv6 ULA literal", async () => {
    const url = "http://[fd00::1]/";

    const result = assertSafeWebhookUrl(url);

    await expect(result).rejects.toThrow(/blocked range/);
  });

  it("rejects IPv4-mapped IPv6 of a private address", async () => {
    const url = "http://[::ffff:127.0.0.1]/";

    const result = assertSafeWebhookUrl(url);

    await expect(result).rejects.toThrow(/blocked range/);
  });

  it("rejects a hostname that resolves into RFC1918", async () => {
    const url = "https://internal.corp/hook";

    const result = assertSafeWebhookUrl(url);

    await expect(result).rejects.toThrow(/blocked range/);
  });

  it("rejects a DNS-rebind hostname (mixed public+loopback records)", async () => {
    const url = "https://rebind.test/hook";

    const result = assertSafeWebhookUrl(url);

    await expect(result).rejects.toThrow(/blocked range/);
  });

  it("rejects an IPv6 hostname that resolves to loopback", async () => {
    const url = "https://ipv6-loopback.example/hook";

    const result = assertSafeWebhookUrl(url);

    await expect(result).rejects.toThrow(/blocked range/);
  });

  it("rejects unresolvable hostnames", async () => {
    const url = "https://nope.invalid/hook";

    const result = assertSafeWebhookUrl(url);

    await expect(result).rejects.toThrow(/Could not resolve/);
  });

  it("rejects malformed URLs", async () => {
    const url = "not a url";

    const result = assertSafeWebhookUrl(url);

    await expect(result).rejects.toThrow(/Invalid URL/);
  });
});

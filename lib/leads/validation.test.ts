import { describe, expect, it } from "vitest";
import { z } from "zod";

const companyWebsiteSchema = z.union([
  z
    .string()
    .url("Invalid URL")
    .refine((u) => /^https?:\/\//i.test(u), "URL must start with http:// or https://"),
  z.literal(""),
]);

describe("companyWebsite validation", () => {
  it("accepts http(s) URLs and the empty string", () => {
    expect(companyWebsiteSchema.safeParse("https://acme.com").success).toBe(true);
    expect(companyWebsiteSchema.safeParse("http://acme.com").success).toBe(true);
    expect(companyWebsiteSchema.safeParse("").success).toBe(true);
  });

  it("rejects javascript: and data: URLs", () => {
    expect(companyWebsiteSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(companyWebsiteSchema.safeParse("data:text/html,<script>alert(1)</script>").success).toBe(
      false,
    );
  });
});

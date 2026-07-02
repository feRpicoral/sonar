import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { requireEnv, validateServerEnv } from "./server";

const CORE = {
  DATABASE_URL: "postgresql://x",
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
};

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of Object.keys(CORE)) {
    saved[k] = process.env[k];
    process.env[k] = CORE[k as keyof typeof CORE];
  }
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("requireEnv", () => {
  it("returns a set value and throws for a missing one", () => {
    expect(requireEnv("DATABASE_URL")).toBe(CORE.DATABASE_URL);
    expect(() => requireEnv("DEFINITELY_UNSET_VAR")).toThrow(/DEFINITELY_UNSET_VAR is not set/);
  });
});

describe("validateServerEnv", () => {
  it("passes when the core env is present", () => {
    expect(() => validateServerEnv()).not.toThrow();
  });

  it("throws naming the missing/invalid variables", () => {
    delete process.env.DATABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
    expect(() => validateServerEnv()).toThrow(/DATABASE_URL/);
    expect(() => validateServerEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});

import { describe, expect, it } from "vitest";

import { FREE_RUN_LIMIT, isAtRunLimit, runLimitFor } from "./limits";

describe("run limits", () => {
  it("caps the Free plan and leaves Pro unlimited", () => {
    expect(runLimitFor("FREE")).toBe(FREE_RUN_LIMIT);
    expect(runLimitFor("PRO")).toBeNull();
  });

  it("flags the Free plan only once usage reaches the cap", () => {
    expect(isAtRunLimit("FREE", FREE_RUN_LIMIT - 1)).toBe(false);
    expect(isAtRunLimit("FREE", FREE_RUN_LIMIT)).toBe(true);
    expect(isAtRunLimit("FREE", FREE_RUN_LIMIT + 5)).toBe(true);
  });

  it("never flags Pro regardless of usage", () => {
    expect(isAtRunLimit("PRO", FREE_RUN_LIMIT * 100)).toBe(false);
  });
});

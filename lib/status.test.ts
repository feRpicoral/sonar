import { describe, expect, it } from "vitest";

import { canMoveLeadStage, LEAD_STAGE_ORDER } from "./status";

describe("canMoveLeadStage", () => {
  it("blocks moving a closed lead back to any earlier stage", () => {
    for (const to of LEAD_STAGE_ORDER) {
      expect(canMoveLeadStage("CLOSED", to)).toBe(to === "CLOSED");
    }
  });

  it("allows any non-closed transition, including moving to closed", () => {
    expect(canMoveLeadStage("DISCOVERY", "QUALIFIED")).toBe(true);
    expect(canMoveLeadStage("DEMO", "DISCOVERY")).toBe(true);
    expect(canMoveLeadStage("PROPOSAL", "CLOSED")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import { assignSpeakers, speakerLabel } from "./speakers";

describe("assignSpeakers", () => {
  it("keeps the same inferred speaker across tight segments", () => {
    const result = assignSpeakers([
      { start: 0, end: 2, text: "Hi there" },
      { start: 2.1, end: 4, text: "thanks for joining" },
    ]);

    expect(result.map((s) => s.speaker)).toEqual(["rep", "rep"]);
  });

  it("flips speaker after a pause longer than the threshold", () => {
    const result = assignSpeakers([
      { start: 0, end: 2, text: "How are you?" },
      { start: 3.5, end: 5, text: "Doing well" },
      { start: 6.8, end: 8, text: "Great to hear" },
    ]);

    expect(result.map((s) => s.speaker)).toEqual(["rep", "lead", "rep"]);
  });

  it("labels inferred speakers without claiming identity", () => {
    expect(speakerLabel("rep")).toBe("Speaker A");
    expect(speakerLabel("lead")).toBe("Speaker B");
  });
});

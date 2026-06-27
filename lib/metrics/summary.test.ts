import { describe, expect, it } from "vitest";

import { summarizeMetric } from "./summary";

const NOW = 1_700_000_000_000;
const DAY_MS = 86_400_000;

function daysAgo(n: number): Date {
  return new Date(NOW - n * DAY_MS - 1000);
}

describe("summarizeMetric", () => {
  it("returns a 10-bucket sparkline and zero delta with no activity", () => {
    const result = summarizeMetric(0, [], NOW);

    expect(result.total).toBe(0);
    expect(result.sparkline).toHaveLength(10);
    expect(result.sparkline.every((v) => v === 0)).toBe(true);
    expect(result.delta).toEqual({ label: "0 this week", direction: "up" });
  });

  it("computes a positive week-over-week delta", () => {
    const dates = [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(7), daysAgo(8)];

    const result = summarizeMetric(42, dates, NOW);

    expect(result.total).toBe(42);
    expect(result.sparkline).toHaveLength(10);
    expect(result.sparkline.reduce((a, b) => a + b, 0)).toBe(5);
    expect(result.delta).toEqual({ label: "50% this week", direction: "up" });
  });

  it("reports a downward delta when this week trails the prior week", () => {
    const dates = [daysAgo(1), daysAgo(7), daysAgo(8), daysAgo(9), daysAgo(10)];

    const result = summarizeMetric(10, dates, NOW);

    expect(result.delta).toEqual({ label: "75% this week", direction: "down" });
  });

  it("ignores timestamps outside the 14-day window", () => {
    const result = summarizeMetric(3, [daysAgo(20), daysAgo(40)], NOW);

    expect(result.sparkline.reduce((a, b) => a + b, 0)).toBe(0);
  });
});

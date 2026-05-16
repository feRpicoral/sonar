import { describe, expect, it } from "vitest";

import {
  AnalysisOutputSchema,
  ResearchOutputSchema,
  StrategyOutputSchema,
  WriterOutputSchema,
} from "./state";

describe("ResearchOutputSchema", () => {
  it("accepts a minimal valid output", () => {
    const ok = ResearchOutputSchema.safeParse({
      segment: "B2B SaaS - observability",
      signals: ["raised $30M Series B"],
      likelyPainPoints: ["data warehouse sprawl"],
      summary: "Acme is a Series B observability platform.",
    });
    expect(ok.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const bad = ResearchOutputSchema.safeParse({ segment: "..." });
    expect(bad.success).toBe(false);
  });
});

describe("AnalysisOutputSchema", () => {
  it("accepts valid sentiments and rejects others", () => {
    const ok = AnalysisOutputSchema.safeParse({
      topics: ["pricing"],
      confirmedPainPoints: [],
      objections: [],
      actionItems: [],
      sentiment: "neutral",
      keyQuotes: [{ text: "We'd need approval", segmentIndex: 2 }],
    });
    expect(ok.success).toBe(true);

    const bad = AnalysisOutputSchema.safeParse({
      topics: [],
      confirmedPainPoints: [],
      objections: [],
      actionItems: [],
      sentiment: "ecstatic",
      keyQuotes: [],
    });
    expect(bad.success).toBe(false);
  });
});

describe("StrategyOutputSchema", () => {
  it("accepts known nextStep values", () => {
    const ok = StrategyOutputSchema.safeParse({
      nextStep: "demo",
      urgency: "high",
      talkingPoints: ["a", "b"],
      reasoning: "They explicitly asked for a demo.",
    });
    expect(ok.success).toBe(true);
  });
});

describe("WriterOutputSchema", () => {
  it("requires a non-negative segmentIndex for citations", () => {
    const bad = WriterOutputSchema.safeParse({
      subject: "Following up on Acme",
      body: "Jane -\n\nGreat chat...",
      citations: [{ phrase: "Q4 hiring spree", transcriptSegmentIndex: -1 }],
    });
    expect(bad.success).toBe(false);
  });
});

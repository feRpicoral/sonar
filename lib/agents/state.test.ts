import { describe, expect, it } from "vitest";

import {
  AnalysisOutputSchema,
  ResearchOutputSchema,
  StrategyOutputSchema,
  WriterOutputSchema,
} from "./state";

describe("ResearchOutputSchema", () => {
  it("accepts a minimal valid output", () => {
    const input = {
      segment: "B2B SaaS - observability",
      signals: ["raised $30M Series B"],
      likelyPainPoints: ["data warehouse sprawl"],
      summary: "Acme is a Series B observability platform.",
    };

    const result = ResearchOutputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const input = { segment: "..." };

    const result = ResearchOutputSchema.safeParse(input);

    expect(result.success).toBe(false);
  });
});

describe("AnalysisOutputSchema", () => {
  it("accepts valid sentiments and rejects others", () => {
    const validInput = {
      topics: ["pricing"],
      confirmedPainPoints: [],
      objections: [],
      actionItems: [],
      sentiment: "neutral",
      keyQuotes: [{ text: "We'd need approval", segmentIndex: 2 }],
    };
    const invalidInput = {
      topics: [],
      confirmedPainPoints: [],
      objections: [],
      actionItems: [],
      sentiment: "ecstatic",
      keyQuotes: [],
    };

    const validResult = AnalysisOutputSchema.safeParse(validInput);
    const invalidResult = AnalysisOutputSchema.safeParse(invalidInput);

    expect(validResult.success).toBe(true);
    expect(invalidResult.success).toBe(false);
  });
});

describe("StrategyOutputSchema", () => {
  it("accepts known nextStep values", () => {
    const input = {
      nextStep: "demo",
      urgency: "high",
      talkingPoints: ["a", "b"],
      reasoning: "They explicitly asked for a demo.",
    };

    const result = StrategyOutputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });
});

describe("WriterOutputSchema", () => {
  it("requires a non-negative segmentIndex for citations", () => {
    const input = {
      subject: "Following up on Acme",
      body: "Jane -\n\nGreat chat...",
      citations: [{ phrase: "Q4 hiring spree", transcriptSegmentIndex: -1 }],
    };

    const result = WriterOutputSchema.safeParse(input);

    expect(result.success).toBe(false);
  });
});

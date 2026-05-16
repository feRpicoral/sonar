import { MODELS, structuredCall } from "@/lib/agents/anthropic";
import { STRATEGY_PROMPT } from "@/lib/agents/prompts";
import {
  type AnalysisOutput,
  type ResearchOutput,
  type StrategyOutput,
  StrategyOutputSchema,
} from "@/lib/agents/state";

export interface StrategyInput {
  leadName: string;
  companyName: string | null;
  research: ResearchOutput;
  analysis: AnalysisOutput | null;
}

export async function strategyNode(input: StrategyInput): Promise<StrategyOutput> {
  const userPrompt = `Prospect contact: ${input.leadName}
Company: ${input.companyName ?? "Unknown"}

Research:
${JSON.stringify(input.research, null, 2)}

${
  input.analysis
    ? `Call analysis:\n${JSON.stringify(input.analysis, null, 2)}`
    : "Call analysis: (no recorded call yet - strategy must rely on research only)"
}

Recommend the next step by calling save_strategy.`;

  return structuredCall({
    model: MODELS.SONNET,
    systemPrompt: STRATEGY_PROMPT,
    userPrompt,
    toolName: "save_strategy",
    toolDescription: "Save the recommended next step and talking points.",
    outputSchema: StrategyOutputSchema,
    maxTokens: 2048,
  });
}

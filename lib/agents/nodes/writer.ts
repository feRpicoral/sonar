import { MODELS, structuredCall } from "@/lib/agents/anthropic";
import { WRITER_PROMPT } from "@/lib/agents/prompts";
import {
  type AnalysisOutput,
  type ResearchOutput,
  type StrategyOutput,
  type WriterOutput,
  WriterOutputSchema,
} from "@/lib/agents/state";

export interface WriterInput {
  leadName: string;
  companyName: string | null;
  research: ResearchOutput;
  analysis: AnalysisOutput | null;
  strategy: StrategyOutput;
  segments?: { start: number; end: number; text: string }[];
  /** Optional reviewer feedback to incorporate on a regeneration. */
  feedback?: string;
}

export async function writerNode(input: WriterInput): Promise<WriterOutput> {
  const segmentsBlock = input.segments
    ? input.segments.map((s, i) => `[${i}] ${s.text.trim()}`).join("\n")
    : "";

  const feedbackBlock = input.feedback
    ? `\nReviewer feedback to incorporate (the previous draft did not satisfy these — adjust accordingly):\n${input.feedback}\n`
    : "";

  const userPrompt = `Prospect contact: ${input.leadName}
Company: ${input.companyName ?? "Unknown"}

Research:
${JSON.stringify(input.research, null, 2)}

${
  input.analysis
    ? `Call analysis:\n${JSON.stringify(input.analysis, null, 2)}`
    : "Call analysis: (no recorded call — write a research-based outreach)"
}

Recommended strategy:
${JSON.stringify(input.strategy, null, 2)}

${
  segmentsBlock
    ? `Transcript segments (use the bracketed index as transcriptSegmentIndex for citations):\n${segmentsBlock}`
    : ""
}${feedbackBlock}

Write the follow-up email by calling save_email. Cite specific transcript segments for any callback to what was said on the call.`;

  return structuredCall({
    model: MODELS.SONNET,
    systemPrompt: WRITER_PROMPT,
    userPrompt,
    toolName: "save_email",
    toolDescription: "Save the follow-up email draft with citations.",
    outputSchema: WriterOutputSchema,
    maxTokens: 4096,
  });
}

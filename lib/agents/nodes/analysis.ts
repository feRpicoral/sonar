import { MODELS, structuredCall } from "@/lib/agents/anthropic";
import { ANALYSIS_PROMPT } from "@/lib/agents/prompts";
import { type AnalysisOutput, AnalysisOutputSchema } from "@/lib/agents/state";
import { formatTimestamp } from "@/lib/transcription/whisper";

export interface AnalysisInput {
  leadName: string;
  companyName: string | null;
  transcript: string;
  segments: { start: number; end: number; text: string }[];
}

export async function analysisNode(input: AnalysisInput): Promise<AnalysisOutput> {
  const segmentsBlock = input.segments
    .map((s, i) => `[${i}] (${formatTimestamp(s.start)}) ${s.text.trim()}`)
    .join("\n");

  const userPrompt = `Prospect contact: ${input.leadName}
Company: ${input.companyName ?? "Unknown"}

Transcript segments (segmentIndex in brackets):

${segmentsBlock}

Analyze the call and return your structured output by calling save_analysis.
For keyQuotes, the segmentIndex MUST match the bracketed number above.`;

  return structuredCall({
    model: MODELS.SONNET,
    systemPrompt: ANALYSIS_PROMPT,
    userPrompt,
    toolName: "save_analysis",
    toolDescription: "Save the structured analysis of the sales call.",
    outputSchema: AnalysisOutputSchema,
    maxTokens: 4096,
  });
}

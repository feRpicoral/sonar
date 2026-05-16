import { MODELS, structuredCall } from "@/lib/agents/anthropic";
import { RESEARCH_PROMPT } from "@/lib/agents/prompts";
import { type ResearchOutput, ResearchOutputSchema } from "@/lib/agents/state";
import { tavilySearch } from "@/lib/agents/tavily";

export interface ResearchInput {
  leadName: string;
  companyName: string | null;
  companyWebsite: string | null;
}

export async function researchNode(input: ResearchInput): Promise<ResearchOutput> {
  const company = input.companyName ?? input.leadName;
  const queryHints = [input.companyWebsite].filter(Boolean).join(" ");
  const query = `${company} company overview recent news ${queryHints}`.trim();

  const results = await tavilySearch({ query, maxResults: 6, searchDepth: "basic" });

  const sourceBlock = results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content.slice(0, 800).trim()}`)
    .join("\n\n");

  const userPrompt = `Prospect contact: ${input.leadName}
Company: ${input.companyName ?? "Unknown"}
Website: ${input.companyWebsite ?? "Unknown"}

Web search results:

${sourceBlock || "(no search results returned)"}

Return the structured research profile by calling save_research.`;

  return structuredCall({
    model: MODELS.HAIKU,
    systemPrompt: RESEARCH_PROMPT,
    userPrompt,
    toolName: "save_research",
    toolDescription: "Save the structured research profile for this prospect.",
    outputSchema: ResearchOutputSchema,
    maxTokens: 2048,
  });
}

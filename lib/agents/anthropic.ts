import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { requireEnv } from "@/lib/env/server";

export const MODELS = {
  SONNET: "claude-sonnet-4-6",
  HAIKU: "claude-haiku-4-5-20251001",
} as const;

export type Model = (typeof MODELS)[keyof typeof MODELS];

let _client: Anthropic | undefined;
function getClient(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
  return _client;
}

export interface StructuredCallOptions<T extends z.ZodType> {
  model: Model;
  systemPrompt: string;
  userPrompt: string;
  toolName: string;
  toolDescription: string;
  outputSchema: T;
  maxTokens?: number;
}

/**
 * Issue a Claude messages call with `tool_use` forced to a single tool whose
 * JSON Schema mirrors the Zod output schema. Returns the parsed, validated
 * output. System prompt is sent with `cache_control: ephemeral` for repeat hits.
 */
export async function structuredCall<T extends z.ZodType>({
  model,
  systemPrompt,
  userPrompt,
  toolName,
  toolDescription,
  outputSchema,
  maxTokens = 4096,
}: StructuredCallOptions<T>): Promise<z.infer<T>> {
  const inputSchema = z.toJSONSchema(outputSchema) as Record<string, unknown>;

  const response = await getClient().messages.create({
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        name: toolName,
        description: toolDescription,
        input_schema: inputSchema as Anthropic.Tool["input_schema"],
      },
    ],
    tool_choice: { type: "tool", name: toolName },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error(`Model did not call tool '${toolName}'.`);
  }

  return outputSchema.parse(toolBlock.input);
}

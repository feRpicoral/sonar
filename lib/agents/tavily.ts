import { z } from "zod";

import { requireEnv } from "@/lib/env/server";

const TavilyResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  content: z.string(),
  score: z.number().optional(),
});

const TavilyResponseSchema = z.object({
  query: z.string().optional(),
  results: z.array(TavilyResultSchema).default([]),
});

export type TavilyResult = z.infer<typeof TavilyResultSchema>;

export interface TavilySearchOptions {
  query: string;
  maxResults?: number;
  searchDepth?: "basic" | "advanced";
}

export async function tavilySearch(options: TavilySearchOptions): Promise<TavilyResult[]> {
  const apiKey = requireEnv("TAVILY_API_KEY");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: options.query,
      max_results: options.maxResults ?? 5,
      search_depth: options.searchDepth ?? "basic",
      include_answer: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Tavily search failed (${response.status}): ${body}`);
  }

  const json = await response.json();
  const parsed = TavilyResponseSchema.parse(json);
  return parsed.results;
}

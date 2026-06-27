import { z } from "zod";

export const ResearchSourceSchema = z.object({
  name: z.string().describe("Source name, e.g. 'Crunchbase' or 'acme.com'"),
  url: z.string().describe("Source URL"),
});

export const ResearchOutputSchema = z.object({
  segment: z.string().describe("Industry segment, e.g. 'B2B SaaS - workforce analytics'"),
  companySize: z.string().optional().describe("Headcount range, e.g. '50-200 employees'"),
  industry: z.string().optional().describe("Primary industry, e.g. 'Healthcare'"),
  fundingStage: z.string().optional().describe("Funding stage, e.g. 'Series B'"),
  employeeCount: z.string().optional().describe("Approx employee count, e.g. '320 employees'"),
  location: z.string().optional().describe("HQ location, e.g. 'Austin, TX'"),
  amountRaised: z.string().optional().describe("Total raised, e.g. '$48M raised'"),
  website: z.string().optional().describe("Company website URL"),
  sources: z
    .array(ResearchSourceSchema)
    .optional()
    .describe("Sources used for the research, with name and URL"),
  signals: z
    .array(z.string())
    .describe("Recent newsworthy signals - funding, hiring, product launches, etc."),
  likelyPainPoints: z
    .array(z.string())
    .describe("Pain points the prospect likely has, based on segment and signals"),
  summary: z.string().describe("2-3 sentence overall summary of the prospect"),
});
export type ResearchOutput = z.infer<typeof ResearchOutputSchema>;

export const KeyQuoteSchema = z.object({
  text: z.string(),
  segmentIndex: z
    .number()
    .int()
    .nonnegative()
    .describe("Index into the provided segments array; used for citation."),
});

export const AnalysisOutputSchema = z.object({
  topics: z.array(z.string()).describe("Main topics discussed in the call"),
  confirmedPainPoints: z
    .array(z.string())
    .describe("Pain points the prospect explicitly confirmed in their own words"),
  objections: z.array(z.string()).describe("Objections raised by the prospect"),
  actionItems: z.array(z.string()).describe("Specific next steps agreed upon"),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  sentimentConfidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Confidence in the sentiment classification, 0-1"),
  keyQuotes: z.array(KeyQuoteSchema).describe("Important verbatim quotes with segment index"),
});
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

export const StrategyOutputSchema = z.object({
  nextStep: z.enum(["follow-up-email", "demo", "proposal", "discovery-call", "nurture"]),
  urgency: z.enum(["high", "medium", "low"]),
  talkingPoints: z
    .array(z.string())
    .describe("3-5 specific talking points the rep should hit in the next interaction"),
  reasoning: z.string().describe("2-3 sentence justification for the next step and urgency"),
});
export type StrategyOutput = z.infer<typeof StrategyOutputSchema>;

export const CitationSchema = z.object({
  phrase: z.string().describe("The exact phrase from the email that needs backing"),
  transcriptSegmentIndex: z
    .number()
    .int()
    .nonnegative()
    .describe("Index into the transcript segments array that supports this phrase"),
});

export const WriterOutputSchema = z.object({
  subject: z.string().describe("Email subject line"),
  body: z.string().describe("Plain-text email body, 100-150 words, warm and direct, one clear CTA"),
  citations: z
    .array(CitationSchema)
    .describe("Phrases in the body backed by specific transcript moments"),
});
export type WriterOutput = z.infer<typeof WriterOutputSchema>;

export interface AgentRunState {
  research?: ResearchOutput;
  analysis?: AnalysisOutput;
  strategy?: StrategyOutput;
  writer?: WriterOutput;
}

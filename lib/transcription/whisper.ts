import { z } from "zod";

import { requireEnv } from "@/lib/env/server";
import { audioExtForMime } from "@/lib/storage/audio-constants";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL = "whisper-large-v3";

const SegmentSchema = z.object({
  id: z.number(),
  start: z.number(),
  end: z.number(),
  text: z.string(),
  no_speech_prob: z.number().optional(),
  avg_logprob: z.number().optional(),
});
export type WhisperSegment = z.infer<typeof SegmentSchema>;

const ResponseSchema = z.object({
  text: z.string(),
  language: z.string().optional(),
  duration: z.number().optional(),
  segments: z.array(SegmentSchema).default([]),
});

export interface TranscriptionResult {
  text: string;
  language?: string;
  durationSec?: number;
  segments: WhisperSegment[];
}

/**
 * Transcribe an audio blob via Groq's Whisper Large v3 endpoint
 * (OpenAI-compatible). Returns text + segments with timestamps, ready to
 * persist on the Call row.
 *
 * Groq parses the upload's filename extension (not the multipart MIME), so
 * we derive the extension from `options.mime` (or `audio.type` as a fallback)
 * and build a Groq-acceptable filename like `audio.opus`.
 */
export async function transcribeAudio(
  audio: Blob,
  options: { mime?: string; baseName?: string } = {},
): Promise<TranscriptionResult> {
  const mime = options.mime ?? audio.type;
  const ext = audioExtForMime(mime);
  const baseName = options.baseName ?? "audio";
  const filename = `${baseName}.${ext}`;

  const formData = new FormData();
  formData.append("file", audio, filename);
  formData.append("model", MODEL);
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${requireEnv("GROQ_API_KEY")}` },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Whisper transcription failed (${response.status}): ${body}`);
  }

  const json = await response.json();
  const parsed = ResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Whisper returned unexpected shape: ${parsed.error.message}`);
  }

  return {
    text: parsed.data.text,
    language: parsed.data.language,
    durationSec: parsed.data.duration,
    segments: parsed.data.segments,
  };
}

export function formatTimestamp(seconds: number): string {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

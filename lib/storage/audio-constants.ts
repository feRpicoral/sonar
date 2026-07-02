import type { CallId, OrgId } from "@/lib/db/types";

// Client-safe audio constants and pure helpers. Kept separate from audio.ts so
// client code (the upload dialog / uploader) can import them without pulling the
// service-role admin client into the browser bundle.

export const CALL_AUDIO_BUCKET = "call-audio";
const BYTES_PER_MEGABYTE = 1024 * 1024;
export const MAX_AUDIO_BYTES = 100 * BYTES_PER_MEGABYTE;

// Mirrors what Groq's whisper endpoint accepts. AAC is intentionally absent -
// Groq sniffs the filename extension and `.aac` is not on their allowlist.
export const ALLOWED_AUDIO_MIME = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/opus",
  "audio/flac",
  "audio/x-flac",
  "audio/x-m4a",
  "audio/m4a",
] as const;

export type AudioMime = (typeof ALLOWED_AUDIO_MIME)[number];

export function isAllowedAudioMime(mime: string): mime is AudioMime {
  return (ALLOWED_AUDIO_MIME as readonly string[]).includes(mime);
}

// Groq validates the upload's filename extension, not the multipart MIME, so
// the file must be sent with a name like "audio.opus" / "audio.mp3" / etc.
// Accepted extensions: flac, mp3, mp4, mpeg, mpga, m4a, ogg, opus, wav, webm.
export function audioExtForMime(mime: string): string {
  switch (mime) {
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/mp4":
      return "mp4";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    case "audio/webm":
      return "webm";
    case "audio/ogg":
      return "ogg";
    case "audio/opus":
      return "opus";
    case "audio/flac":
    case "audio/x-flac":
      return "flac";
    case "audio/x-m4a":
    case "audio/m4a":
      return "m4a";
    default:
      // Caller has already validated against ALLOWED_AUDIO_MIME, so this
      // branch is defensive. mp3 is the safest fallback Groq accepts.
      return "mp3";
  }
}

export function callAudioPath(orgId: OrgId, callId: CallId): string {
  return `audio/${orgId}/${callId}.bin`;
}

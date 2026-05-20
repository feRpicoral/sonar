import type { CallId, OrgId } from "@/lib/db/types";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const CALL_AUDIO_BUCKET = "call-audio";
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024; // 100 MB

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
  "audio/aac",
  "audio/x-aac",
] as const;

export type AudioMime = (typeof ALLOWED_AUDIO_MIME)[number];

export function isAllowedAudioMime(mime: string): mime is AudioMime {
  return (ALLOWED_AUDIO_MIME as readonly string[]).includes(mime);
}

export function callAudioPath(orgId: OrgId, callId: CallId): string {
  return `audio/${orgId}/${callId}.bin`;
}

export async function createSignedCallUpload(
  orgId: OrgId,
  callId: CallId,
): Promise<{ path: string; token: string; signedUrl: string }> {
  const supabase = createAdminSupabase();
  const path = callAudioPath(orgId, callId);
  const { data, error } = await supabase.storage
    .from(CALL_AUDIO_BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw error;
  return { path, token: data.token, signedUrl: data.signedUrl };
}

export async function downloadCallAudio(path: string): Promise<Blob> {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase.storage.from(CALL_AUDIO_BUCKET).download(path);
  if (error) throw error;
  return data;
}

export async function getSignedCallPlaybackUrl(
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase.storage
    .from(CALL_AUDIO_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

import "server-only";

import type { CallId, OrgId } from "@/lib/db/types";
import { createAdminSupabase } from "@/lib/supabase/admin";

import { CALL_AUDIO_BUCKET, callAudioPath } from "./audio-constants";

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

export async function deleteCallAudioObjects(paths: string[]): Promise<{ error?: string }> {
  const uniquePaths = [...new Set(paths)].filter(Boolean);
  if (uniquePaths.length === 0) return {};

  const supabase = createAdminSupabase();
  const { error } = await supabase.storage.from(CALL_AUDIO_BUCKET).remove(uniquePaths);
  return error ? { error: error.message } : {};
}

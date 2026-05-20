import { prepareCallUploadAction, transcribeCallAction } from "@/lib/calls/actions";
import { CALL_AUDIO_BUCKET, isAllowedAudioMime, MAX_AUDIO_BYTES } from "@/lib/storage/audio";
import { createBrowserSupabase } from "@/lib/supabase/client";

export type UploadStage = "idle" | "uploading" | "transcribing";

export type UploadCallResult = { ok: true; callId: string } | { ok: false; error: string };

/**
 * Drives the full upload flow for a call recording: validate → prepare signed
 * URL → upload to Supabase Storage → trigger transcription. Shared between the
 * upload dialog and the lead-page drop overlay.
 */
export async function uploadCallFile(
  file: File,
  leadId: string,
  onStageChange: (stage: UploadStage) => void,
): Promise<UploadCallResult> {
  if (!isAllowedAudioMime(file.type)) {
    return { ok: false, error: "Unsupported audio format" };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return { ok: false, error: "File exceeds 100 MB" };
  }

  onStageChange("uploading");
  const prep = await prepareCallUploadAction({
    leadId,
    mime: file.type,
    sizeBytes: file.size,
  });
  if ("error" in prep) return { ok: false, error: prep.error };

  const supabase = createBrowserSupabase();
  const { error: uploadError } = await supabase.storage
    .from(CALL_AUDIO_BUCKET)
    .uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type });
  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` };
  }

  onStageChange("transcribing");
  const result = await transcribeCallAction(prep.callId);
  if (result.error) return { ok: false, error: result.error };

  return { ok: true, callId: prep.callId };
}

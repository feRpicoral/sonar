import { prepareCallUploadAction, transcribeCallAction } from "@/lib/calls/actions";
import { CALL_AUDIO_BUCKET, isAllowedAudioMime, MAX_AUDIO_BYTES } from "@/lib/storage/audio";
import { createBrowserSupabase } from "@/lib/supabase/client";

export type UploadStage = "idle" | "uploading" | "transcribing";

export type UploadCallResult =
  | { ok: true; callId: string }
  | { ok: false; error: string; cancelled?: boolean; callId?: string };

export interface UploadCallOptions {
  onStageChange: (stage: UploadStage) => void;
  /** Fired as soon as the Call row exists, so the caller knows what to cancel. */
  onCallCreated?: (callId: string) => void;
  /** Abort signal that races against the transcription step. */
  signal?: AbortSignal;
}

/**
 * Drives the full upload flow for a call recording: validate → prepare signed
 * URL → upload to Supabase Storage → trigger transcription. Shared between the
 * upload dialog and the lead-page drop overlay.
 *
 * Cancellation: Groq's sync Whisper endpoint has no cancel. We expose a soft
 * cancel by aborting the client-side wait — the server-side transcribe action
 * keeps running, but its final DB write is gated on `deletedAt IS NULL`, so
 * cancelled work is discarded.
 */
export async function uploadCallFile(
  file: File,
  leadId: string,
  options: UploadCallOptions,
): Promise<UploadCallResult> {
  const { onStageChange, onCallCreated, signal } = options;

  if (!isAllowedAudioMime(file.type)) {
    return { ok: false, error: "Unsupported audio format" };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return { ok: false, error: "File exceeds 100 MB" };
  }

  if (signal?.aborted) return { ok: false, error: "Cancelled", cancelled: true };

  onStageChange("uploading");
  const prep = await prepareCallUploadAction({
    leadId,
    mime: file.type,
    sizeBytes: file.size,
  });
  if ("error" in prep) return { ok: false, error: prep.error };

  onCallCreated?.(prep.callId);
  if (signal?.aborted) {
    return { ok: false, error: "Cancelled", cancelled: true, callId: prep.callId };
  }

  const supabase = createBrowserSupabase();
  const { error: uploadError } = await supabase.storage
    .from(CALL_AUDIO_BUCKET)
    .uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type });
  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}`, callId: prep.callId };
  }

  if (signal?.aborted) {
    return { ok: false, error: "Cancelled", cancelled: true, callId: prep.callId };
  }

  onStageChange("transcribing");

  // Race the server action against the abort signal so the UI moves on
  // immediately when the user cancels, even though Groq keeps working.
  const transcribePromise = transcribeCallAction(prep.callId);
  const result = await raceWithAbort(transcribePromise, signal);
  if (result.cancelled) {
    return { ok: false, error: "Cancelled", cancelled: true, callId: prep.callId };
  }
  if (result.value.error) {
    return { ok: false, error: result.value.error, callId: prep.callId };
  }

  return { ok: true, callId: prep.callId };
}

async function raceWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
): Promise<{ cancelled: true } | { cancelled: false; value: T }> {
  if (!signal) {
    const value = await promise;
    return { cancelled: false, value };
  }
  if (signal.aborted) return { cancelled: true };

  return await new Promise((resolve, reject) => {
    const onAbort = () => resolve({ cancelled: true });
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve({ cancelled: false, value });
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

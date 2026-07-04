import {
  cancelCallTranscriptionAction,
  prepareCallUploadAction,
  transcribeCallAction,
} from "@/lib/calls/actions";
import {
  CALL_AUDIO_BUCKET,
  isAllowedAudioMime,
  MAX_AUDIO_BYTES,
} from "@/lib/storage/audio-constants";
import { createBrowserSupabase } from "@/lib/supabase/client";

export type UploadStage = "idle" | "uploading" | "transcribing";

export type UploadCallResult =
  | { ok: true; callId: string }
  | { ok: false; error: string; cancelled?: boolean; callId?: string };

export interface UploadCallOptions {
  onStageChange: (stage: UploadStage) => void;
  /** Fired as soon as the Call row exists, so the caller knows what to cancel. */
  onCallCreated?: (callId: string) => void;
  signal?: AbortSignal;
}

/**
 * Groq's sync Whisper endpoint has no cancel. We expose a soft
 * cancel by aborting the client-side wait; the server-side transcribe action
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
    await cleanupOrphanCall(prep.callId);
    return { ok: false, error: `Upload failed: ${uploadError.message}`, callId: prep.callId };
  }

  if (signal?.aborted) {
    return { ok: false, error: "Cancelled", cancelled: true, callId: prep.callId };
  }

  onStageChange("transcribing");

  // Race the server action against the abort signal so the UI moves on
  // immediately when the user cancels, even though Groq keeps working.
  // transcribeCallAction can throw (Supabase download error, missing
  // GROQ_API_KEY, Whisper failure, ...) - catch those too so the orphan
  // cleanup runs even when the action rejects instead of returning an error.
  const transcribePromise = transcribeCallAction(prep.callId);
  let result: Awaited<ReturnType<typeof raceWithAbort<Awaited<typeof transcribePromise>>>>;
  try {
    result = await raceWithAbort(transcribePromise, signal);
  } catch (err) {
    await cleanupOrphanCall(prep.callId);
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message, callId: prep.callId };
  }
  if (result.cancelled) {
    return { ok: false, error: "Cancelled", cancelled: true, callId: prep.callId };
  }
  if (result.value.error) {
    await cleanupOrphanCall(prep.callId);
    return { ok: false, error: result.value.error, callId: prep.callId };
  }

  return { ok: true, callId: prep.callId };
}

/**
 * Soft-delete a Call row that never got past upload/transcription. Without
 * this, the lead page would show a permanent "Transcribing..." entry with no
 * storage object behind it. Failures here are swallowed - the original
 * upload/transcribe error is the more useful thing to surface.
 */
async function cleanupOrphanCall(callId: string): Promise<void> {
  try {
    await cancelCallTranscriptionAction(callId);
  } catch {
    // Best effort; the user already sees the upload/transcribe error.
  }
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

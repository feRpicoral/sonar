"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAudit } from "@/lib/audit/log";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { asCallId, asLeadId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";
import { createSignedCallUpload, downloadCallAudio } from "@/lib/storage/audio";
import { callAudioPath, isAllowedAudioMime, MAX_AUDIO_BYTES } from "@/lib/storage/audio-constants";
import { assignSpeakers } from "@/lib/transcription/speakers";
import { transcribeAudio } from "@/lib/transcription/whisper";

const prepareSchema = z.object({
  leadId: z.string().uuid(),
  mime: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});

export type PrepareUploadResult =
  | { error: string }
  | { callId: string; path: string; token: string; signedUrl: string };

export async function prepareCallUploadAction(input: {
  leadId: string;
  mime: string;
  sizeBytes: number;
}): Promise<PrepareUploadResult> {
  const session = await requireSessionOrOnboard();
  const parsed = prepareSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  if (!isAllowedAudioMime(parsed.data.mime)) {
    return { error: "Unsupported audio format" };
  }
  if (parsed.data.sizeBytes > MAX_AUDIO_BYTES) {
    return { error: "File exceeds 100 MB limit" };
  }

  const db = getDb(session.orgId);
  const lead = await db.lead.findUnique({
    where: { id: parsed.data.leadId },
    select: { id: true, deletedAt: true },
  });
  if (!lead || lead.deletedAt) return { error: "Lead not found" };

  const callId = randomUUID();
  const path = callAudioPath(session.orgId, asCallId(callId));

  const call = await db.call.create({
    data: {
      id: callId,
      orgId: session.orgId,
      leadId: lead.id,
      audioPath: path,
      createdByUserId: session.userId,
    },
    select: { id: true },
  });

  const signed = await createSignedCallUpload(session.orgId, asCallId(call.id));
  return { callId: call.id, path: signed.path, token: signed.token, signedUrl: signed.signedUrl };
}

export type TranscribeResult = { error?: string; ok?: true };

export async function transcribeCallAction(callId: string): Promise<TranscribeResult> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const call = await db.call.findUnique({
    where: { id: callId },
    select: { id: true, leadId: true, audioPath: true, transcriptText: true, deletedAt: true },
  });
  if (!call) return { error: "Call not found" };
  if (call.deletedAt) return { ok: true };
  if (call.transcriptText) return { ok: true };

  await db.call.updateMany({
    where: { id: call.id, deletedAt: null },
    data: { transcriptionStatus: "TRANSCRIBING" },
  });

  let result;
  try {
    const audio = await downloadCallAudio(call.audioPath);
    // The Blob from Supabase Storage carries the contentType that was set
    // during upload, so audio.type is the right MIME to feed Groq.
    result = await transcribeAudio(audio, { mime: audio.type, baseName: call.id });
  } catch (err) {
    await db.call.updateMany({
      where: { id: call.id, deletedAt: null },
      data: { transcriptionStatus: "FAILED" },
    });
    return { error: err instanceof Error ? err.message : "Transcription failed" };
  }

  const segments = assignSpeakers(
    result.segments.map((s) => ({ start: s.start, end: s.end, text: s.text })),
  );
  const hasSpeech = result.text.trim().length > 0 && segments.length > 0;

  // Race-safe: if cancelCallTranscriptionAction soft-deleted the row while
  // Groq was working, updateMany matches zero rows and the transcript is
  // discarded silently. Groq's sync endpoint has no cancel; this is the
  // closest we can get without moving to the Batch API (24h SLA, wrong tool).
  const written = await db.$transaction(async (tx) => {
    const updated = await tx.call.updateMany({
      where: { id: call.id, deletedAt: null },
      data: {
        transcriptText: result.text,
        segments: segments as never,
        durationSec: result.durationSec ? Math.round(result.durationSec) : null,
        transcriptionStatus: hasSpeech ? "DONE" : "NO_SPEECH",
      },
    });
    if (updated.count === 0) return updated;
    await writeAudit(
      {
        orgId: session.orgId,
        actorUserId: session.userId,
        action: "call.uploaded",
        targetType: "call",
        targetId: asCallId(call.id),
        metadata: {
          leadId: asLeadId(call.leadId),
          segmentCount: result.segments.length,
          durationSec: result.durationSec,
        },
      },
      tx,
    );
    return updated;
  });

  if (written.count === 0) return { ok: true };

  revalidatePath(`/leads/${call.leadId}`);
  revalidatePath(`/leads/${call.leadId}/calls/${call.id}`);
  return { ok: true };
}

export async function cancelCallTranscriptionAction(callId: string): Promise<TranscribeResult> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const call = await db.call.findUnique({
    where: { id: callId },
    select: { id: true, leadId: true, deletedAt: true, transcriptText: true },
  });
  if (!call) return { error: "Call not found" };
  if (call.deletedAt) return { ok: true };
  if (call.transcriptText) {
    return { error: "Transcript already saved - delete instead" };
  }

  await db.$transaction(async (tx) => {
    await tx.call.update({
      where: { id: callId },
      data: { deletedAt: new Date() },
    });

    await writeAudit(
      {
        orgId: session.orgId,
        actorUserId: session.userId,
        action: "call.cancelled",
        targetType: "call",
        targetId: asCallId(callId),
        metadata: { leadId: asLeadId(call.leadId) },
      },
      tx,
    );
  });

  revalidatePath(`/leads/${call.leadId}`);
  return { ok: true };
}

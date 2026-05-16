"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAudit } from "@/lib/audit/log";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { asCallId, asLeadId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";
import {
  callAudioPath,
  createSignedCallUpload,
  downloadCallAudio,
  isAllowedAudioMime,
  MAX_AUDIO_BYTES,
} from "@/lib/storage/audio";
import { transcribeAudio } from "@/lib/transcription/whisper";

// ─── Step 1: prepare a signed upload URL ────────────────────────────────────

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

// ─── Step 2: transcribe the uploaded audio (synchronous for phase 3) ────────

export type TranscribeResult = { error?: string; ok?: true };

export async function transcribeCallAction(callId: string): Promise<TranscribeResult> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const call = await db.call.findUnique({
    where: { id: callId },
    select: { id: true, leadId: true, audioPath: true, transcriptText: true },
  });
  if (!call) return { error: "Call not found" };
  if (call.transcriptText) return { ok: true }; // already done - idempotent

  const audio = await downloadCallAudio(call.audioPath);
  const result = await transcribeAudio(audio, { filename: `${call.id}.bin` });

  await db.call.update({
    where: { id: call.id },
    data: {
      transcriptText: result.text,
      segments: result.segments as never,
      durationSec: result.durationSec ? Math.round(result.durationSec) : null,
    },
  });

  await writeAudit({
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
  });

  revalidatePath(`/leads/${call.leadId}`);
  revalidatePath(`/leads/${call.leadId}/calls/${call.id}`);
  return { ok: true };
}

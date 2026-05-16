import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GenerateFollowupButton } from "@/components/calls/generate-followup-button";
import { TranscriptViewer } from "@/components/calls/transcript-viewer";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { formatTimestamp } from "@/lib/transcription/whisper";

interface Segment {
  start: number;
  end: number;
  text: string;
}

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string; callId: string }>;
}) {
  const { id, callId } = await params;
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const call = await db.call.findUnique({
    where: { id: callId },
    select: {
      id: true,
      leadId: true,
      transcriptText: true,
      segments: true,
      durationSec: true,
      createdAt: true,
      deletedAt: true,
      lead: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!call || call.deletedAt || call.leadId !== id) notFound();

  const segments = (Array.isArray(call.segments) ? call.segments : []) as unknown as Segment[];

  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link
          href={`/leads/${id}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to {call.lead.name}
        </Link>

        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Call transcript</h1>
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              {call.durationSec != null && (
                <span className="font-mono text-xs">{formatTimestamp(call.durationSec)}</span>
              )}
              {call.durationSec != null && <span>,</span>}
              <span>{call.createdAt.toISOString().slice(0, 10)}</span>
              <span>,</span>
              <span>uploaded by {call.createdBy.name ?? call.createdBy.email}</span>
            </div>
          </div>
          {call.transcriptText && <GenerateFollowupButton leadId={id} callId={call.id} />}
        </header>

        {call.transcriptText ? (
          <TranscriptViewer segments={segments} />
        ) : (
          <div className="bg-card border-border grid place-items-center rounded-lg border border-dashed py-24">
            <p className="text-muted-foreground font-mono text-xs">Transcription pending…</p>
          </div>
        )}
      </div>
    </div>
  );
}

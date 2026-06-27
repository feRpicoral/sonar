import { ArrowLeft, Clock, Loader2, MicOff, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GenerateFollowupButton } from "@/components/calls/generate-followup-button";
import { TranscriptViewer } from "@/components/calls/transcript-viewer";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { assignSpeakers, type RawSegment } from "@/lib/transcription/speakers";
import { formatTimestamp } from "@/lib/transcription/whisper";

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
      transcriptionStatus: true,
      segments: true,
      durationSec: true,
      createdAt: true,
      deletedAt: true,
      lead: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!call || call.deletedAt || call.leadId !== id) notFound();

  const rawSegments = (Array.isArray(call.segments)
    ? call.segments
    : []) as unknown as RawSegment[];
  const segments = assignSpeakers(rawSegments);
  const isDone = call.transcriptionStatus === "DONE" && segments.length > 0;

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b px-6">
        <Link
          href={`/leads/${id}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px] transition-colors"
        >
          <ArrowLeft className="size-3.5" /> {call.lead.name}
        </Link>
        {isDone && <GenerateFollowupButton leadId={id} callId={call.id} />}
      </header>

      <div className="mx-auto w-full max-w-4xl px-6 py-7">
        <div className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight">Call transcript</h1>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            {call.durationSec != null && (
              <span className="font-mono text-xs">{formatTimestamp(call.durationSec)}</span>
            )}
            <span>{call.createdAt.toISOString().slice(0, 10)}</span>
            <span>·</span>
            <span>uploaded by {call.createdBy.name ?? call.createdBy.email}</span>
            {isDone && (
              <>
                <span>·</span>
                <span className="font-mono text-xs">{segments.length} segments</span>
              </>
            )}
          </div>
        </div>

        {isDone ? (
          <TranscriptViewer segments={segments} leadName={call.lead.name} />
        ) : (
          <StateCard status={call.transcriptionStatus} />
        )}
      </div>
    </div>
  );
}

const STATE = {
  QUEUED: {
    icon: Clock,
    title: "Queued for transcription",
    body: "This recording is waiting to be transcribed.",
  },
  TRANSCRIBING: {
    icon: Loader2,
    title: "Transcribing…",
    body: "Generating the transcript with timestamps. This usually takes a moment.",
    spin: true,
  },
  NO_SPEECH: {
    icon: MicOff,
    title: "No speech detected",
    body: "We couldn't find any speech in this recording.",
  },
  FAILED: {
    icon: TriangleAlert,
    title: "Transcription failed",
    body: "Something went wrong while transcribing. Try uploading the recording again.",
  },
  DONE: {
    icon: MicOff,
    title: "No transcript",
    body: "This recording has no transcript segments.",
  },
} as const;

function StateCard({ status }: { status: keyof typeof STATE }) {
  const meta = STATE[status];
  const Icon = meta.icon;
  return (
    <div className="bg-card border-border grid place-items-center rounded-xl border border-dashed py-20">
      <div className="max-w-[320px] text-center">
        <span className="bg-muted text-muted-foreground mb-3.5 inline-flex size-11 items-center justify-center rounded-full">
          <Icon className={"size-5" + ("spin" in meta && meta.spin ? " animate-spin" : "")} />
        </span>
        <p className="text-sm font-semibold">{meta.title}</p>
        <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">{meta.body}</p>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";

import { type Citation, EmailSplitView } from "@/components/email/email-split-view";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { assignSpeakers, type RawSegment } from "@/lib/transcription/speakers";

export default async function ApproveEmailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const draft = await db.emailDraft.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      body: true,
      citations: true,
      status: true,
      failureReason: true,
      run: {
        select: {
          lead: { select: { id: true, name: true, email: true } },
          call: { select: { segments: true } },
        },
      },
      deliveries: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: {
          status: true,
          recipientEmail: true,
          failureReason: true,
          failureCode: true,
        },
      },
    },
  });

  if (!draft) notFound();

  const citations = (Array.isArray(draft.citations)
    ? draft.citations
    : []) as unknown as Citation[];
  const rawSegments = draft.run.call
    ? ((Array.isArray(draft.run.call.segments)
        ? draft.run.call.segments
        : []) as unknown as RawSegment[])
    : [];
  const segments = assignSpeakers(rawSegments);

  return (
    <EmailSplitView
      draftId={draft.id}
      subject={draft.subject}
      body={draft.body}
      citations={citations}
      segments={segments}
      status={draft.status}
      leadId={draft.run.lead.id}
      leadName={draft.run.lead.name}
      recipient={draft.run.lead.email}
      failureReason={draft.failureReason}
      delivery={draft.deliveries[0] ?? null}
    />
  );
}

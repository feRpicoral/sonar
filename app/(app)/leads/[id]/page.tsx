import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, ExternalLink, FileAudio, Loader2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CancelTranscriptionButton } from "@/components/calls/cancel-transcription-button";
import { LeadDropzoneOverlay } from "@/components/calls/lead-dropzone-overlay";
import { UploadCallDialog } from "@/components/calls/upload-call-dialog";
import { LeadEmailEditor } from "@/components/leads/lead-email-editor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { formatTimestamp } from "@/lib/transcription/whisper";

function initials(s: string) {
  return (
    s
      .split(/[\s@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

const STATUS_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery",
  QUALIFIED: "Qualified",
  DEMO: "Demo",
  PROPOSAL: "Proposal",
  CLOSED: "Closed",
};

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const lead = await db.lead.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      companyWebsite: true,
      status: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { name: true, email: true, avatarUrl: true } },
      createdBy: { select: { name: true, email: true } },
      calls: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          durationSec: true,
          transcriptText: true,
          createdAt: true,
        },
      },
    },
  });

  if (!lead || lead.deletedAt) notFound();

  return (
    <LeadDropzoneOverlay leadId={lead.id}>
      <div className="px-8 py-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <Link
            href="/leads"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to leads
          </Link>

          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{lead.name}</h1>
              {lead.companyName && (
                <p className="text-muted-foreground text-sm">
                  {lead.companyWebsite ? (
                    <a
                      href={lead.companyWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-foreground inline-flex items-center gap-1 hover:underline"
                    >
                      {lead.companyName}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    lead.companyName
                  )}
                </p>
              )}
              <LeadEmailEditor leadId={lead.id} initialEmail={lead.email} />
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-mono text-[10px]">
                {STATUS_LABELS[lead.status]}
              </Badge>
              <UploadCallDialog leadId={lead.id} />
            </div>
          </header>

          <section className="bg-card border-border grid gap-6 rounded-lg border p-6 sm:grid-cols-3">
            <Field label="Assigned to">
              {lead.assignedTo ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={lead.assignedTo.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[9px]">
                      {initials(lead.assignedTo.name ?? lead.assignedTo.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{lead.assignedTo.name ?? lead.assignedTo.email}</span>
                </div>
              ) : (
                <span className="text-muted-foreground font-mono text-xs">unassigned</span>
              )}
            </Field>
            <Field label="Created by">
              <span className="text-sm">{lead.createdBy.name ?? lead.createdBy.email}</span>
            </Field>
            <Field label="Last activity">
              <span className="text-muted-foreground font-mono text-xs">
                {lead.updatedAt.toISOString().slice(0, 10)}
              </span>
            </Field>
          </section>

          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Calls</h2>
              <span className="text-muted-foreground font-mono text-xs">
                {lead.calls.length} {lead.calls.length === 1 ? "recording" : "recordings"}
              </span>
            </header>
            {lead.calls.length === 0 ? (
              <div className="bg-card border-border grid place-items-center rounded-lg border border-dashed py-16">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                    <FileAudio className="text-muted-foreground h-4 w-4" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Upload a recording to get a transcript with timestamps.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="bg-card border-border overflow-hidden rounded-lg border">
                {lead.calls.map((call) => (
                  <li key={call.id} className="border-border border-b last:border-b-0">
                    <Link
                      href={`/leads/${id}/calls/${call.id}`}
                      className="hover:bg-muted/30 flex items-center justify-between px-4 py-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-md">
                          {call.transcriptText ? (
                            <FileAudio className="text-muted-foreground h-4 w-4" />
                          ) : (
                            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {call.transcriptText ? "Transcript ready" : "Transcribing…"}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {formatDistanceToNow(call.createdAt, { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {call.durationSec && (
                          <span className="text-muted-foreground font-mono text-xs">
                            {formatTimestamp(call.durationSec)}
                          </span>
                        )}
                        {!call.transcriptText && <CancelTranscriptionButton callId={call.id} />}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </LeadDropzoneOverlay>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs tracking-wide uppercase">{label}</div>
      <div>{children}</div>
    </div>
  );
}

import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, ExternalLink, FileAudio } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CancelTranscriptionButton } from "@/components/calls/cancel-transcription-button";
import { LeadDropzoneOverlay } from "@/components/calls/lead-dropzone-overlay";
import { UploadCallDialog } from "@/components/calls/upload-call-dialog";
import { EditLeadDialog } from "@/components/leads/edit-lead-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DotPill, StatusPill } from "@/components/ui/status-pill";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { leadStageMeta, transcriptionStatusMeta } from "@/lib/status";
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
          transcriptionStatus: true,
          createdAt: true,
        },
      },
    },
  });

  if (!lead || lead.deletedAt) notFound();

  const stage = leadStageMeta[lead.status];

  return (
    <LeadDropzoneOverlay leadId={lead.id}>
      <div className="flex min-h-full flex-col">
        <header className="bg-background sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b px-6">
          <Link
            href="/leads"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px] transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Leads
          </Link>
          <div className="flex items-center gap-2">
            <EditLeadDialog lead={lead} />
            <UploadCallDialog leadId={lead.id} />
          </div>
        </header>

        <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{lead.name}</h1>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                {lead.companyWebsite ? (
                  <a
                    href={lead.companyWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground inline-flex items-center gap-1 hover:underline"
                  >
                    {lead.companyName ?? lead.companyWebsite}
                    <ExternalLink className="size-3" />
                  </a>
                ) : (
                  lead.companyName && <span>{lead.companyName}</span>
                )}
                {lead.email && (
                  <>
                    {(lead.companyName || lead.companyWebsite) && <span>·</span>}
                    <span className="font-mono text-xs">{lead.email}</span>
                  </>
                )}
              </div>
            </div>
            <DotPill stage={stage.stage}>{stage.label}</DotPill>
          </div>

          <section className="bg-card border-border shadow-panel grid gap-6 rounded-xl border p-5 sm:grid-cols-3">
            <Field label="Assigned to">
              {lead.assignedTo ? (
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
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
              <span className="text-muted-foreground text-sm">
                {formatDistanceToNow(lead.updatedAt, { addSuffix: true })}
              </span>
            </Field>
          </section>

          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Calls</h2>
              <span className="text-muted-foreground font-mono text-xs">
                {lead.calls.length} {lead.calls.length === 1 ? "recording" : "recordings"}
              </span>
            </header>
            {lead.calls.length === 0 ? (
              <div className="bg-card border-border grid place-items-center rounded-xl border border-dashed py-16">
                <div className="flex max-w-[320px] flex-col items-center gap-3 text-center">
                  <div className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-full">
                    <FileAudio className="size-5" />
                  </div>
                  <p className="text-sm font-semibold">No calls yet</p>
                  <p className="text-muted-foreground text-[13px] leading-relaxed">
                    Upload a recording (or drag it anywhere on this page) to get a transcript with
                    timestamps.
                  </p>
                  <UploadCallDialog leadId={lead.id} />
                </div>
              </div>
            ) : (
              <div className="bg-card border-border shadow-panel overflow-hidden rounded-xl border">
                {lead.calls.map((call, i) => {
                  const done = call.transcriptionStatus === "DONE";
                  const pending =
                    call.transcriptionStatus === "QUEUED" ||
                    call.transcriptionStatus === "TRANSCRIBING";
                  return (
                    <div key={call.id} className={i > 0 ? "border-border-2 border-t" : undefined}>
                      <Link
                        href={`/leads/${id}/calls/${call.id}`}
                        className="hover:bg-muted/40 flex items-center justify-between gap-3 px-[18px] py-3 transition-colors"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md">
                            <FileAudio className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {done ? "Transcript ready" : "Recording"}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {formatDistanceToNow(call.createdAt, { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {call.durationSec != null && (
                            <span className="text-muted-foreground font-mono text-xs">
                              {formatTimestamp(call.durationSec)}
                            </span>
                          )}
                          <StatusPill
                            descriptor={transcriptionStatusMeta[call.transcriptionStatus]}
                          />
                          {pending && <CancelTranscriptionButton callId={call.id} />}
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </LeadDropzoneOverlay>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

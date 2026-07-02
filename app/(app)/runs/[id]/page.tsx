import { formatDistanceToNow } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RunViewerClient } from "@/components/runs/run-viewer-client";
import { StatusPill } from "@/components/ui/status-pill";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { runStatusMeta } from "@/lib/status";

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const run = await db.agentRun.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      lead: { select: { id: true, name: true, companyName: true } },
      call: { select: { segments: true, durationSec: true } },
      emailDraft: { select: { id: true, status: true } },
      steps: {
        orderBy: { createdAt: "asc" },
        select: {
          node: true,
          status: true,
          output: true,
          errorMessage: true,
          errorCode: true,
        },
      },
    },
  });

  if (!run) notFound();

  const segmentCount = Array.isArray(run.call?.segments) ? run.call.segments.length : 0;
  const call = run.call ? { segmentCount, durationSec: run.call.durationSec } : null;

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b px-6">
        <Link
          href={`/leads/${run.lead.id}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px] transition-colors"
        >
          <ArrowLeft className="size-3.5" /> {run.lead.name}
        </Link>
        <StatusPill descriptor={runStatusMeta[run.status]} />
      </header>

      <div className="mx-auto w-full max-w-3xl px-6 py-7">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Agent run</h1>
          <p className="text-muted-foreground mt-1 text-[13px]">
            {run.lead.name}
            {run.lead.companyName && ` · ${run.lead.companyName}`} · started{" "}
            {formatDistanceToNow(run.startedAt, { addSuffix: true })}
          </p>
        </div>

        <RunViewerClient
          runId={run.id}
          runStatus={run.status}
          leadName={run.lead.name}
          call={call}
          emailDraft={run.emailDraft}
          steps={run.steps.map((s) => ({
            node: s.node,
            status: s.status,
            output: s.output,
            errorMessage: s.errorMessage,
            errorCode: s.errorCode,
          }))}
        />
      </div>
    </div>
  );
}

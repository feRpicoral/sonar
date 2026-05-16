import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RunViewerClient } from "@/components/runs/run-viewer-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Queued",
  RUNNING: "Running",
  AWAITING_APPROVAL: "Awaiting approval",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

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
      emailDraft: { select: { id: true, status: true } },
      steps: {
        orderBy: { createdAt: "asc" },
        select: {
          node: true,
          status: true,
          output: true,
          errorMessage: true,
          startedAt: true,
          completedAt: true,
        },
      },
    },
  });

  if (!run) notFound();

  const variant: "default" | "secondary" | "destructive" =
    run.status === "COMPLETED" ? "default" : run.status === "FAILED" ? "destructive" : "secondary";

  const draftReady =
    run.emailDraft && (run.status === "AWAITING_APPROVAL" || run.status === "COMPLETED");

  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link
          href={`/leads/${run.lead.id}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to {run.lead.name}
        </Link>

        <header className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Agent run</h1>
              <p className="text-muted-foreground text-sm">
                {run.lead.name}
                {run.lead.companyName && ` , ${run.lead.companyName}`}
              </p>
            </div>
            <Badge variant={variant} className="font-mono text-[10px]">
              {STATUS_LABELS[run.status] ?? run.status.toLowerCase()}
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono text-xs">
            started {formatDistanceToNow(run.startedAt, { addSuffix: true })}
          </p>
        </header>

        <RunViewerClient
          runStatus={run.status}
          steps={run.steps.map((s) => ({
            node: s.node,
            status: s.status,
            output: s.output,
            errorMessage: s.errorMessage,
          }))}
        />

        {draftReady && run.emailDraft && (
          <div className="bg-card border-primary/30 flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">
                {run.emailDraft.status === "SENT" ? "Email sent" : "Email draft ready for review"}
              </p>
              <p className="text-muted-foreground text-xs">
                {run.emailDraft.status === "SENT"
                  ? "Open the draft to see citations and delivery status."
                  : "Open the split-view to approve, edit, or regenerate with feedback."}
              </p>
            </div>
            <Button asChild size="sm" className="gap-1.5">
              <Link href={`/emails/${run.emailDraft.id}/approve`}>
                {run.emailDraft.status === "SENT" ? "View" : "Review"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

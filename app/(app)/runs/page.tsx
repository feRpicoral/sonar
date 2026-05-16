import { formatDistanceToNow } from "date-fns";
import { Activity, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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

function variant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "COMPLETED") return "default";
  if (status === "FAILED") return "destructive";
  if (status === "AWAITING_APPROVAL") return "outline";
  return "secondary";
}

export default async function RunsPage() {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const runs = await db.agentRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      lead: { select: { id: true, name: true, companyName: true } },
    },
  });

  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {runs.length} {runs.length === 1 ? "run" : "runs"}
          </p>
        </header>

        {runs.length === 0 ? (
          <div className="bg-card border-border grid place-items-center rounded-lg border border-dashed py-24">
            <div className="flex max-w-sm flex-col items-center gap-4 text-center">
              <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                <Activity className="text-muted-foreground h-5 w-5" />
              </div>
              <p className="text-muted-foreground text-sm">
                No agent runs yet. Open a lead with an attached call and click{" "}
                <strong>Generate follow-up</strong> to start one.
              </p>
            </div>
          </div>
        ) : (
          <ul className="bg-card border-border overflow-hidden rounded-lg border">
            {runs.map((run) => (
              <li key={run.id}>
                <Link
                  href={`/runs/${run.id}`}
                  className="hover:bg-muted/30 border-border flex items-center justify-between border-b px-4 py-3 transition-colors last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{run.lead.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {run.lead.companyName ? `${run.lead.companyName}, ` : ""}
                      started {formatDistanceToNow(run.startedAt, { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={variant(run.status)} className="font-mono text-[10px]">
                      {STATUS_LABELS[run.status] ?? run.status.toLowerCase()}
                    </Badge>
                    <ArrowRight className="text-muted-foreground h-3.5 w-3.5" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

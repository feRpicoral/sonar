import { formatDistanceToNow } from "date-fns";
import { ArrowRight, FileAudio, Sparkles, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

const RUN_STATUS_LABELS: Record<string, string> = {
  PENDING: "Queued",
  RUNNING: "Running",
  AWAITING_APPROVAL: "Awaiting approval",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery",
  QUALIFIED: "Qualified",
  DEMO: "Demo",
  PROPOSAL: "Proposal",
  CLOSED: "Closed",
};

function runVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "COMPLETED") return "default";
  if (status === "FAILED") return "destructive";
  if (status === "AWAITING_APPROVAL") return "outline";
  return "secondary";
}

export default async function DashboardPage() {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const [leadCount, callCount, runCount, recentRuns, recentLeads] = await Promise.all([
    db.lead.count({ where: { deletedAt: null } }),
    db.call.count({ where: { deletedAt: null } }),
    db.agentRun.count(),
    db.agentRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        startedAt: true,
        lead: { select: { name: true, companyName: true } },
      },
    }),
    db.lead.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, name: true, companyName: true, status: true, updatedAt: true },
    }),
  ]);

  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-5xl space-y-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Welcome back.</p>
        </header>

        <section className="grid grid-cols-3 gap-4">
          <StatCard
            label="Leads"
            value={leadCount}
            icon={<Users className="h-4 w-4" />}
            href="/leads"
          />
          <StatCard label="Calls" value={callCount} icon={<FileAudio className="h-4 w-4" />} />
          <StatCard
            label="Agent runs"
            value={runCount}
            icon={<Sparkles className="h-4 w-4" />}
            href="/runs"
          />
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Recent runs</h2>
              <Link
                href="/runs"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {recentRuns.length === 0 ? (
              <EmptyHint message="No runs yet. Open a lead, attach a recorded call, and click Generate follow-up." />
            ) : (
              <ul className="bg-card border-border overflow-hidden rounded-lg border">
                {recentRuns.map((run) => (
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
                      <Badge variant={runVariant(run.status)} className="font-mono text-[10px]">
                        {RUN_STATUS_LABELS[run.status] ?? run.status.toLowerCase()}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Recent leads</h2>
              <Link
                href="/leads"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {recentLeads.length === 0 ? (
              <EmptyHint message="No leads yet. Create your first one in the kanban." />
            ) : (
              <ul className="bg-card border-border overflow-hidden rounded-lg border">
                {recentLeads.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="hover:bg-muted/30 border-border flex items-center justify-between border-b px-4 py-3 transition-colors last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{lead.name}</p>
                        {lead.companyName && (
                          <p className="text-muted-foreground truncate text-xs">
                            {lead.companyName}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {LEAD_STATUS_LABELS[lead.status] ?? lead.status.toLowerCase()}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <div className="bg-card border-border rounded-lg border p-5">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block transition-opacity hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="bg-card border-border rounded-lg border border-dashed p-6 text-center">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

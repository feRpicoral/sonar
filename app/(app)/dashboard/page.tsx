import { formatDistanceToNow } from "date-fns";
import { Activity, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { DotPill, StatusPill } from "@/components/ui/status-pill";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { getDashboardMetrics } from "@/lib/metrics/dashboard";
import { leadStageMeta, runStatusMeta } from "@/lib/status";

const AVATAR_COLORS = ["violet", "emerald", "amber", "solid"] as const;

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

function avatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export default async function DashboardPage() {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const [metrics, recentRuns, recentLeads] = await Promise.all([
    getDashboardMetrics(session.orgId),
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

  const isEmpty =
    metrics.leads.total === 0 && metrics.calls.total === 0 && metrics.runs.total === 0;

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b px-6">
        <h1 className="text-[15px] font-semibold">Dashboard</h1>
        <Button size="sm" asChild>
          <Link href="/leads">
            <Plus />
            New lead
          </Link>
        </Button>
      </header>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <div className="space-y-5 px-6 py-7">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label="Leads"
              value={metrics.leads.total}
              delta={metrics.leads.delta}
              data={metrics.leads.sparkline}
              href="/leads"
            />
            <MetricCard
              label="Calls"
              value={metrics.calls.total}
              delta={metrics.calls.delta}
              data={metrics.calls.sparkline}
            />
            <MetricCard
              label="Agent runs"
              value={metrics.runs.total}
              delta={metrics.runs.delta}
              data={metrics.runs.sparkline}
              href="/runs"
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ListCard title="Recent runs" href="/runs" empty="No runs yet.">
              {recentRuns.map((run, i) => (
                <Row
                  key={run.id}
                  href={`/runs/${run.id}`}
                  name={run.lead.name}
                  company={run.lead.companyName}
                  index={i}
                  time={formatDistanceToNow(run.startedAt, { addSuffix: true })}
                  trailing={<StatusPill descriptor={runStatusMeta[run.status]} />}
                />
              ))}
            </ListCard>

            <ListCard title="Recent leads" href="/leads" empty="No leads yet.">
              {recentLeads.map((lead, i) => {
                const stage = leadStageMeta[lead.status];
                return (
                  <Row
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    name={lead.name}
                    company={lead.companyName}
                    index={i}
                    time={formatDistanceToNow(lead.updatedAt, { addSuffix: true })}
                    trailing={<DotPill stage={stage.stage}>{stage.label}</DotPill>}
                  />
                );
              })}
            </ListCard>
          </section>
        </div>
      )}
    </div>
  );
}

function ListCard({
  title,
  href,
  empty,
  children,
}: {
  title: string;
  href: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <div className="bg-card border-border shadow-panel overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between px-[18px] py-3.5">
        <span className="text-sm font-semibold">{title}</span>
        <Link
          href={href}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[13px] transition-colors"
        >
          View all
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
      {children.length === 0 ? (
        <p className="border-border-2 text-muted-foreground border-t px-[18px] py-8 text-center text-sm">
          {empty}
        </p>
      ) : (
        children
      )}
    </div>
  );
}

function Row({
  href,
  name,
  company,
  time,
  trailing,
  index,
}: {
  href: string;
  name: string;
  company: string | null;
  time: string;
  trailing: React.ReactNode;
  index: number;
}) {
  return (
    <Link
      href={href}
      className="border-border-2 hover:bg-muted/40 flex items-center gap-[11px] border-t px-[18px] py-[11px] transition-colors"
    >
      <Avatar size="sm">
        <AvatarFallback color={avatarColor(index)}>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-[550]">{name}</p>
        {company && <p className="text-muted-foreground truncate text-[11.5px]">{company}</p>}
      </div>
      {trailing}
      <span className="text-muted-foreground ml-1 hidden text-[11.5px] whitespace-nowrap sm:inline">
        {time}
      </span>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-[300px] text-center">
        <span className="bg-muted border-border text-muted-foreground mb-3.5 inline-flex size-[46px] items-center justify-center rounded-xl border">
          <Activity className="size-[22px]" />
        </span>
        <p className="text-[15px] font-semibold">No activity yet</p>
        <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">
          Create your first lead and upload a call to generate a follow-up.
        </p>
        <Button size="sm" asChild className="mt-4">
          <Link href="/leads">
            <Plus />
            New lead
          </Link>
        </Button>
      </div>
    </div>
  );
}

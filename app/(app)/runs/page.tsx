import { formatDistanceToNow } from "date-fns";
import { Activity, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { runStatusMeta } from "@/lib/status";

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
      lead: { select: { id: true, name: true, companyName: true } },
    },
  });

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background sticky top-0 z-10 flex h-14 items-center gap-3 border-b px-6">
        <h1 className="text-[15px] font-semibold">Runs</h1>
        <span className="text-muted-foreground font-mono text-xs">{runs.length}</span>
      </header>

      {runs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="max-w-[340px] text-center">
            <span className="bg-muted border-border text-muted-foreground mb-3.5 inline-flex size-[46px] items-center justify-center rounded-xl border">
              <Activity className="size-[22px]" />
            </span>
            <p className="text-[15px] font-semibold">No agent runs yet</p>
            <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">
              Open a lead with an attached call and click Generate follow-up to start one.
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-4xl px-6 py-7">
          <div className="bg-card border-border shadow-panel overflow-hidden rounded-xl border">
            {runs.map((run, i) => (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                className={
                  "hover:bg-muted/40 flex items-center gap-[11px] px-[18px] py-3 transition-colors" +
                  (i > 0 ? " border-border-2 border-t" : "")
                }
              >
                <Avatar size="sm">
                  <AvatarFallback color={AVATAR_COLORS[i % AVATAR_COLORS.length]}>
                    {initials(run.lead.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-[550]">{run.lead.name}</p>
                  {run.lead.companyName && (
                    <p className="text-muted-foreground truncate text-[11.5px]">
                      {run.lead.companyName}
                    </p>
                  )}
                </div>
                <span className="text-muted-foreground hidden text-[11.5px] whitespace-nowrap sm:inline">
                  {formatDistanceToNow(run.startedAt, { addSuffix: true })}
                </span>
                <StatusPill descriptor={runStatusMeta[run.status]} />
                <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

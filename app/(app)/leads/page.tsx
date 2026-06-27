import { Users } from "lucide-react";

import { CreateLeadDialog } from "@/components/leads/create-lead-dialog";
import { LeadFilterTabs } from "@/components/leads/lead-filter-tabs";
import { LeadKanban } from "@/components/leads/lead-kanban";
import { LeadTable } from "@/components/leads/lead-table";
import { LeadViewToggle } from "@/components/leads/lead-view-toggle";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; view?: string }>;
}) {
  const session = await requireSessionOrOnboard();
  const { filter, view } = await searchParams;
  const isList = view === "list";

  const db = getDb(session.orgId);
  const where: { deletedAt: null; assignedToUserId?: string | null } = { deletedAt: null };
  if (filter === "my") where.assignedToUserId = session.userId;
  else if (filter === "unassigned") where.assignedToUserId = null;

  const [leads, allCount, myCount, unassignedCount] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        companyName: true,
        companyWebsite: true,
        status: true,
        updatedAt: true,
        assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    }),
    db.lead.count({ where: { deletedAt: null } }),
    db.lead.count({ where: { deletedAt: null, assignedToUserId: session.userId } }),
    db.lead.count({ where: { deletedAt: null, assignedToUserId: null } }),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background sticky top-0 z-10 flex flex-col gap-3 border-b px-6 py-3 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <div className="flex items-center gap-4">
          <h1 className="text-[15px] font-semibold">Leads</h1>
          <LeadFilterTabs counts={{ all: allCount, my: myCount, unassigned: unassignedCount }} />
        </div>
        <div className="flex items-center gap-2">
          <LeadViewToggle />
          <CreateLeadDialog />
        </div>
      </header>

      {leads.length === 0 ? (
        <EmptyLeads filtered={Boolean(filter)} />
      ) : isList ? (
        <LeadTable leads={leads} />
      ) : (
        <LeadKanban leads={leads} />
      )}
    </div>
  );
}

function EmptyLeads({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-[320px] text-center">
        <span className="bg-muted border-border text-muted-foreground mb-3.5 inline-flex size-[46px] items-center justify-center rounded-xl border">
          <Users className="size-[22px]" />
        </span>
        <p className="text-[15px] font-semibold">
          {filtered ? "No leads match this filter" : "No leads yet"}
        </p>
        <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">
          {filtered
            ? "Try a different filter, or create a new lead."
            : "Create your first lead to start tracking your pipeline."}
        </p>
        <div className="mt-4 inline-flex">
          <CreateLeadDialog />
        </div>
      </div>
    </div>
  );
}

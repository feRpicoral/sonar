import { CreateLeadDialog } from "@/components/leads/create-lead-dialog";
import { LeadFilterTabs } from "@/components/leads/lead-filter-tabs";
import { LeadKanban } from "@/components/leads/lead-kanban";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await requireSessionOrOnboard();
  const { filter } = await searchParams;

  const db = getDb(session.orgId);
  const where: {
    deletedAt: null;
    assignedToUserId?: string | null;
  } = { deletedAt: null };
  if (filter === "my") where.assignedToUserId = session.userId;
  else if (filter === "unassigned") where.assignedToUserId = null;

  const leads = await db.lead.findMany({
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
  });

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <header className="border-border flex flex-col gap-4 border-b px-4 pt-6 pb-4 sm:px-8 sm:pt-10 sm:pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {leads.length} {leads.length === 1 ? "lead" : "leads"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LeadFilterTabs />
          <CreateLeadDialog />
        </div>
      </header>
      {leads.length === 0 && !filter ? (
        <div className="flex flex-1 items-center justify-center px-8">
          <div className="bg-card border-border flex max-w-sm flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center">
            <h2 className="font-medium">No leads yet</h2>
            <p className="text-muted-foreground text-sm">
              Create your first lead to start tracking your pipeline.
            </p>
            <CreateLeadDialog />
          </div>
        </div>
      ) : (
        <LeadKanban leads={leads} />
      )}
    </div>
  );
}

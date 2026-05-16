import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";

import { RestoreLeadButton } from "@/components/trash/restore-button";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

export default async function TrashPage() {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const leads = await db.lead.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    select: {
      id: true,
      name: true,
      companyName: true,
      deletedAt: true,
      createdBy: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Soft-deleted leads. They&apos;re purged automatically after 30 days.
          </p>
        </header>

        {leads.length === 0 ? (
          <div className="bg-card border-border grid place-items-center rounded-lg border border-dashed py-16">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                <Trash2 className="text-muted-foreground h-4 w-4" />
              </div>
              <p className="text-muted-foreground text-sm">No deleted leads.</p>
            </div>
          </div>
        ) : (
          <ul className="bg-card border-border overflow-hidden rounded-lg border">
            {leads.map((lead) => (
              <li
                key={lead.id}
                className="border-border flex items-center justify-between border-b px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium">{lead.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {lead.companyName && `${lead.companyName} · `}
                    deleted{" "}
                    {lead.deletedAt && formatDistanceToNow(lead.deletedAt, { addSuffix: true })}
                  </p>
                </div>
                <RestoreLeadButton leadId={lead.id} name={lead.name} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

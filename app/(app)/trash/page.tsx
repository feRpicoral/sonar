import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";

import { EmptyTrashButton, TrashRowActions } from "@/components/trash/trash-actions";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { purgeDaysLeft, TRASH_RETENTION_DAYS } from "@/lib/leads/trash";
import { cn } from "@/lib/utils";

const URGENT_DAYS = 7;

export default async function TrashPage() {
  const session = await requireSessionOrOnboard();
  const isAdmin = session.role === "ADMIN";
  const db = getDb(session.orgId);

  const leads = await db.lead.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    select: {
      id: true,
      name: true,
      companyName: true,
      deletedAt: true,
      deletedBy: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-semibold">Trash</h1>
          <span className="text-muted-foreground font-mono text-xs">{leads.length}</span>
        </div>
        {isAdmin && leads.length > 0 && <EmptyTrashButton />}
      </header>

      <div className="mx-auto w-full max-w-4xl px-6 py-7">
        <p className="text-muted-foreground mb-4 text-[13px]">
          Soft-deleted leads are kept for {TRASH_RETENTION_DAYS} days, then purged.
        </p>

        {leads.length === 0 ? (
          <div className="bg-card border-border grid place-items-center rounded-xl border border-dashed py-16">
            <div className="max-w-[300px] text-center">
              <span className="bg-muted text-muted-foreground mb-3.5 inline-flex size-11 items-center justify-center rounded-full">
                <Trash2 className="size-5" />
              </span>
              <p className="text-sm font-semibold">Trash is empty</p>
              <p className="text-muted-foreground mt-1.5 text-[13px]">
                Deleted leads show up here.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-card border-border shadow-panel overflow-hidden rounded-xl border">
            {leads.map((lead, i) => {
              const daysLeft = lead.deletedAt
                ? purgeDaysLeft(lead.deletedAt)
                : TRASH_RETENTION_DAYS;
              const urgent = daysLeft <= URGENT_DAYS;
              return (
                <div
                  key={lead.id}
                  className={cn(
                    "flex items-center gap-3 px-[18px] py-3",
                    i > 0 && "border-border-2 border-t",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-[550]">{lead.name}</p>
                    <p className="text-muted-foreground truncate text-[11.5px]">
                      {lead.companyName && `${lead.companyName} · `}
                      deleted{" "}
                      {lead.deletedAt && formatDistanceToNow(lead.deletedAt, { addSuffix: true })}
                      {lead.deletedBy && ` by ${lead.deletedBy.name ?? lead.deletedBy.email}`}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "hidden font-mono text-[11px] whitespace-nowrap sm:inline",
                      urgent ? "text-amber-fg" : "text-muted-foreground",
                    )}
                  >
                    purges in {daysLeft}d
                  </span>
                  <TrashRowActions leadId={lead.id} name={lead.name} canPurge={isAdmin} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

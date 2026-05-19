import { LeadCard, type LeadCardProps } from "./lead-card";

const COLUMNS: { status: LeadCardProps["status"]; label: string }[] = [
  { status: "DISCOVERY", label: "Discovery" },
  { status: "QUALIFIED", label: "Qualified" },
  { status: "DEMO", label: "Demo" },
  { status: "PROPOSAL", label: "Proposal" },
  { status: "CLOSED", label: "Closed" },
];

export function LeadKanban({ leads }: { leads: LeadCardProps[] }) {
  const grouped: Record<LeadCardProps["status"], LeadCardProps[]> = {
    DISCOVERY: [],
    QUALIFIED: [],
    DEMO: [],
    PROPOSAL: [],
    CLOSED: [],
  };
  for (const lead of leads) grouped[lead.status].push(lead);

  return (
    <div className="flex h-full gap-3 overflow-x-auto px-4 pt-6 pb-8 sm:px-8 sm:pt-8">
      {COLUMNS.map((col) => {
        const items = grouped[col.status];
        return (
          <div key={col.status} className="flex w-64 shrink-0 flex-col sm:w-72">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {col.label}
              </h2>
              <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-mono text-[10px]">
                {items.length}
              </span>
            </header>
            <div className="bg-muted/60 border-border/60 flex flex-1 flex-col gap-2 rounded-lg border p-2">
              {items.length === 0 ? (
                <div className="grid h-24 place-items-center">
                  <p className="text-muted-foreground font-mono text-[10px]">empty</p>
                </div>
              ) : (
                items.map((lead) => <LeadCard key={lead.id} {...lead} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

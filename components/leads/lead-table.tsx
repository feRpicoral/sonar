"use client";

import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import type { LeadCardProps } from "./lead-card";
import { LeadDetailModal } from "./lead-detail-modal";

type Status = LeadCardProps["status"];

const COLUMNS: { status: Status; label: string }[] = [
  { status: "DISCOVERY", label: "Discovery" },
  { status: "QUALIFIED", label: "Qualified" },
  { status: "DEMO", label: "Demo" },
  { status: "PROPOSAL", label: "Proposal" },
  { status: "CLOSED", label: "Closed" },
];

function initials(s: string) {
  return (
    s
      .split(/[\s@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

export function LeadTable({ leads }: { leads: LeadCardProps[] }) {
  const [selected, setSelected] = useState<LeadCardProps | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<Status>>(new Set());

  const toggleGroup = (status: Status) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const grouped: Record<Status, LeadCardProps[]> = {
    DISCOVERY: [],
    QUALIFIED: [],
    DEMO: [],
    PROPOSAL: [],
    CLOSED: [],
  };
  for (const lead of leads) grouped[lead.status].push(lead);

  // Keep the modal backed by fresh server data after revalidation.
  const liveSelected = selected ? (leads.find((l) => l.id === selected.id) ?? null) : null;

  return (
    <>
      <div className="px-4 pt-6 pb-8 sm:px-8 sm:pt-8">
        <div className="border-border bg-card overflow-hidden rounded-lg border">
          {COLUMNS.map((col, colIdx) => {
            const items = grouped[col.status];
            const isCollapsed = collapsed.has(col.status);
            const panelId = `group-panel-${col.status}`;
            return (
              <section key={col.status} className={cn(colIdx > 0 && "border-border border-t")}>
                <button
                  type="button"
                  onClick={() => toggleGroup(col.status)}
                  aria-expanded={!isCollapsed}
                  aria-controls={panelId}
                  className={cn(
                    "bg-muted/40 hover:bg-muted/60 flex w-full items-center justify-between px-4 py-2 text-left transition-colors",
                    !isCollapsed && "border-border border-b",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <ChevronDown
                      className={cn(
                        "text-muted-foreground h-3.5 w-3.5 transition-transform",
                        isCollapsed && "-rotate-90",
                      )}
                    />
                    <span className="text-xs font-medium tracking-wide uppercase">{col.label}</span>
                  </span>
                  <span className="text-muted-foreground bg-background/60 rounded-full px-2 py-0.5 font-mono text-[10px]">
                    {items.length}
                  </span>
                </button>
                {!isCollapsed &&
                  (items.length === 0 ? (
                    <div
                      id={panelId}
                      className="text-muted-foreground px-4 py-3 font-mono text-[10px]"
                    >
                      empty
                    </div>
                  ) : (
                    <ul id={panelId}>
                      {items.map((lead, i) => (
                        <li key={lead.id} className={cn(i > 0 && "border-border/60 border-t")}>
                          <button
                            type="button"
                            onClick={() => setSelected(lead)}
                            className="group hover:bg-muted/30 flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {lead.name}
                            </span>
                            <span className="text-muted-foreground hidden max-w-[45%] min-w-0 truncate text-xs sm:inline">
                              {lead.companyName ?? ""}
                            </span>
                            <span className="ml-auto flex shrink-0 items-center gap-3">
                              {lead.assignedTo ? (
                                <Avatar className="h-5 w-5">
                                  <AvatarImage
                                    src={lead.assignedTo.avatarUrl ?? undefined}
                                    alt={lead.assignedTo.name ?? lead.assignedTo.email}
                                  />
                                  <AvatarFallback className="text-[9px]">
                                    {initials(lead.assignedTo.name ?? lead.assignedTo.email)}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <span className="text-muted-foreground font-mono text-[10px]">
                                  unassigned
                                </span>
                              )}
                              <span className="text-muted-foreground hidden text-right font-mono text-xs whitespace-nowrap sm:inline">
                                {formatDistanceToNow(lead.updatedAt, { addSuffix: true })}
                              </span>
                            </span>
                            <ChevronRight
                              className="text-muted-foreground h-3.5 w-3.5 shrink-0 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                              aria-hidden
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ))}
              </section>
            );
          })}
        </div>
      </div>
      <LeadDetailModal lead={liveSelected} onClose={() => setSelected(null)} />
    </>
  );
}

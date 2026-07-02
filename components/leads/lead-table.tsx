"use client";

import { formatDistanceToNow } from "date-fns";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dot, DotPill } from "@/components/ui/status-pill";
import {
  type LeadStatus,
  softDeleteLeadsBulkAction,
  updateLeadStatusBulkAction,
} from "@/lib/leads/actions";
import { LEAD_STAGE_ORDER, leadStageMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

import type { LeadCardProps } from "./lead-card";
import { LeadDetailModal } from "./lead-detail-modal";

type Status = LeadCardProps["status"];

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

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[5px] border",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border-strong bg-card",
      )}
    >
      {checked && <Check className="size-[11px]" strokeWidth={3} />}
    </span>
  );
}

export function LeadTable({ leads }: { leads: LeadCardProps[] }) {
  const [selectedLead, setSelectedLead] = useState<LeadCardProps | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<Status>>(new Set());
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [isPending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const g: Record<Status, LeadCardProps[]> = {
      DISCOVERY: [],
      QUALIFIED: [],
      DEMO: [],
      PROPOSAL: [],
      CLOSED: [],
    };
    for (const lead of leads) g[lead.status].push(lead);
    const dir = sortDir === "desc" ? -1 : 1;
    for (const s of LEAD_STAGE_ORDER) {
      g[s].sort((a, b) => dir * (a.updatedAt.getTime() - b.updatedAt.getTime()));
    }
    return g;
  }, [leads, sortDir]);

  const toggleGroup = (status: Status) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clearSelection = () => setSelected(new Set());

  const bulkMove = (status: LeadStatus) => {
    const ids = [...selected];
    startTransition(async () => {
      const result = await updateLeadStatusBulkAction(ids, status);
      if (result.error) toast.error(result.error);
      else {
        const moved = result.movedCount ?? 0;
        toast.success(
          result.skippedCount
            ? `Moved ${moved}, skipped ${result.skippedCount} closed`
            : `Moved ${moved} ${moved === 1 ? "lead" : "leads"}`,
        );
        clearSelection();
      }
    });
  };

  const bulkDelete = () => {
    const ids = [...selected];
    startTransition(async () => {
      const result = await softDeleteLeadsBulkAction(ids);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`Moved ${result.deletedCount ?? 0} to trash`);
        clearSelection();
      }
    });
  };

  const liveSelected = selectedLead ? (leads.find((l) => l.id === selectedLead.id) ?? null) : null;

  return (
    <>
      {selected.size > 0 && (
        <div className="bg-muted border-border sticky top-14 z-10 flex items-center gap-3 border-b px-6 py-2">
          <span className="text-[13px] font-semibold">{selected.size} selected</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="xs" variant="outline" disabled={isPending}>
                Move to
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel className="text-muted-foreground font-mono text-[9.5px] tracking-wider uppercase">
                Move to
              </DropdownMenuLabel>
              {LEAD_STAGE_ORDER.map((s) => (
                <DropdownMenuItem key={s} onSelect={() => bulkMove(s)}>
                  {leadStageMeta[s].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="xs"
            variant="outline"
            disabled={isPending}
            onClick={bulkDelete}
            className="text-rose-fg border-rose-bd hover:bg-rose-bg"
          >
            <Trash2 />
            Delete
          </Button>
          <span className="flex-1" />
          <Button size="xs" variant="ghost" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      )}

      <div className="border-border flex items-center gap-3.5 border-b px-6 py-2">
        <span className="w-4" />
        <div className="text-muted-foreground flex-[2.2] font-mono text-[10px] tracking-wider uppercase">
          Name
        </div>
        <div className="text-muted-foreground hidden flex-2 font-mono text-[10px] tracking-wider uppercase sm:block">
          Company
        </div>
        <div className="text-muted-foreground flex-[1.4] font-mono text-[10px] tracking-wider uppercase">
          Stage
        </div>
        <button
          type="button"
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          className="text-fg-2 flex w-[70px] items-center justify-end gap-1 font-mono text-[10px] tracking-wider uppercase"
        >
          Updated
          <ChevronDown
            className={cn(
              "text-primary size-3 transition-transform",
              sortDir === "asc" && "rotate-180",
            )}
          />
        </button>
      </div>

      <div>
        {LEAD_STAGE_ORDER.map((status) => {
          const items = grouped[status];
          const isCollapsed = collapsed.has(status);
          const meta = leadStageMeta[status];
          return (
            <section key={status}>
              <button
                type="button"
                onClick={() => toggleGroup(status)}
                aria-expanded={!isCollapsed}
                className="bg-bg-subtle border-border-2 flex w-full items-center gap-2 border-b px-6 py-2 text-left"
              >
                <ChevronDown
                  className={cn(
                    "text-muted-foreground size-3.5 transition-transform",
                    isCollapsed && "-rotate-90",
                  )}
                />
                <Dot stage={meta.stage} />
                <span className="text-[12.5px] font-semibold">{meta.label}</span>
                <span className="text-muted-foreground font-mono text-[11px]">{items.length}</span>
              </button>
              {!isCollapsed &&
                items.map((lead) => {
                  const isSel = selected.has(lead.id);
                  return (
                    <div
                      key={lead.id}
                      className={cn(
                        "border-border-2 flex items-center gap-3.5 border-b px-6 py-2.5 transition-colors",
                        isSel
                          ? "bg-[color-mix(in_oklch,var(--violet-bg)_28%,var(--background))]"
                          : "hover:bg-muted/40",
                      )}
                    >
                      <button
                        type="button"
                        aria-label={isSel ? "Deselect" : "Select"}
                        onClick={() => toggleSelected(lead.id)}
                      >
                        <CheckBox checked={isSel} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedLead(lead)}
                        className="flex min-w-0 flex-[2.2] items-center gap-2.5 text-left"
                      >
                        <Avatar size="sm">
                          <AvatarImage
                            src={lead.assignedTo?.avatarUrl ?? undefined}
                            alt={lead.assignedTo?.name ?? lead.name}
                          />
                          <AvatarFallback className="text-[9px]">
                            {initials(lead.assignedTo?.name ?? lead.assignedTo?.email ?? lead.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-[13px] font-[550]">{lead.name}</span>
                      </button>
                      <div className="text-muted-foreground hidden min-w-0 flex-2 truncate text-[12.5px] sm:block">
                        {lead.companyName ?? ""}
                      </div>
                      <div className="flex-[1.4]">
                        <DotPill stage={meta.stage}>{meta.label}</DotPill>
                      </div>
                      <div className="text-muted-foreground w-[70px] text-right text-[12px]">
                        {formatDistanceToNow(lead.updatedAt, { addSuffix: false })}
                      </div>
                    </div>
                  );
                })}
            </section>
          );
        })}
      </div>

      <LeadDetailModal lead={liveSelected} onClose={() => setSelectedLead(null)} />
    </>
  );
}

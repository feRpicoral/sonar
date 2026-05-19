"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, Globe } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateLeadStatusAction } from "@/lib/leads/actions";
import { cn } from "@/lib/utils";

import type { LeadCardProps } from "./lead-card";

type Status = LeadCardProps["status"];

const STATUSES: { value: Status; label: string }[] = [
  { value: "DISCOVERY", label: "Discovery" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "DEMO", label: "Demo" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "CLOSED", label: "Closed" },
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

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LeadDetailModal({
  lead,
  onClose,
}: {
  lead: LeadCardProps | null;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  // Optimistic status so the radio reflects the click instantly while the
  // server action is in flight.
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<Status | null, Status>(
    lead?.status ?? null,
    (_state, next) => next,
  );

  const onPickStatus = (next: Status) => {
    if (!lead || optimisticStatus === next) return;
    startTransition(async () => {
      setOptimisticStatus(next);
      const result = await updateLeadStatusAction(lead.id, next);
      if (result.error) toast.error(result.error);
    });
  };

  return (
    <Dialog open={!!lead} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {lead ? (
          <>
            <DialogHeader>
              <DialogTitle className="truncate">{lead.name}</DialogTitle>
              {(lead.companyName || lead.companyWebsite) && (
                <DialogDescription className="flex items-center gap-1.5">
                  {lead.companyWebsite && <Globe className="h-3 w-3 shrink-0" />}
                  <span className="truncate">
                    {lead.companyName ??
                      (lead.companyWebsite ? hostFromUrl(lead.companyWebsite) : null)}
                  </span>
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4 py-2">
              <Field label="Status">
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => {
                    const active = optimisticStatus === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => onPickStatus(s.value)}
                        disabled={isPending}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-border",
                          isPending && "cursor-not-allowed opacity-60",
                        )}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Assignee">
                  {lead.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage
                          src={lead.assignedTo.avatarUrl ?? undefined}
                          alt={lead.assignedTo.name ?? lead.assignedTo.email}
                        />
                        <AvatarFallback className="text-[9px]">
                          {initials(lead.assignedTo.name ?? lead.assignedTo.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm">
                        {lead.assignedTo.name ?? lead.assignedTo.email}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground font-mono text-xs">unassigned</span>
                  )}
                </Field>
                <Field label="Updated">
                  <span className="text-muted-foreground font-mono text-xs">
                    {formatDistanceToNow(lead.updatedAt, { addSuffix: true })}
                  </span>
                </Field>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isPending}>
                Close
              </Button>
              <Button asChild>
                <Link href={`/leads/${lead.id}`}>
                  Open full lead
                  <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-muted-foreground text-[10px] tracking-wide uppercase">{label}</div>
      <div>{children}</div>
    </div>
  );
}

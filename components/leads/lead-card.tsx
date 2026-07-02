"use client";

import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { softDeleteLeadAction, updateLeadStatusAction } from "@/lib/leads/actions";
import { LEAD_STAGE_ORDER, leadStageMeta } from "@/lib/status";

export interface LeadCardProps {
  id: string;
  name: string;
  companyName: string | null;
  companyWebsite: string | null;
  status: "DISCOVERY" | "QUALIFIED" | "DEMO" | "PROPOSAL" | "CLOSED";
  updatedAt: Date;
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
}

const AVATAR_COLORS = ["violet", "emerald", "amber", "solid"] as const;

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

function colorFor(id: string) {
  let h = 0;
  for (const c of id) h = (h + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h]!;
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LeadCard({
  id,
  name,
  companyName,
  companyWebsite,
  status,
  updatedAt,
  assignedTo,
}: LeadCardProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const changeStatus = (next: LeadCardProps["status"]) => {
    if (next === status) return;
    startTransition(async () => {
      const result = await updateLeadStatusAction(id, next);
      if (result.error) toast.error(result.error);
    });
  };

  const onDelete = () => {
    startTransition(async () => {
      const result = await softDeleteLeadAction(id);
      if (result.error) toast.error(result.error);
      else toast.success("Lead moved to trash");
      setConfirmOpen(false);
    });
  };

  const company = companyName ?? (companyWebsite ? hostFromUrl(companyWebsite) : null);

  return (
    <>
      <article className="group bg-card border-border hover:border-border-strong relative rounded-lg border p-3 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/leads/${id}`} className="min-w-0 flex-1">
            <div className="truncate text-[13px] leading-tight font-semibold hover:underline">
              {name}
            </div>
            {company && (
              <div className="text-muted-foreground truncate text-[11.5px]">{company}</div>
            )}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-xs"
                variant="ghost"
                className="text-muted-foreground -mt-0.5 -mr-1 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                disabled={isPending}
              >
                <MoreHorizontal />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-muted-foreground font-mono text-[9.5px] tracking-wider uppercase">
                Move to
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={status}
                onValueChange={(v) => changeStatus(v as LeadCardProps["status"])}
              >
                {LEAD_STAGE_ORDER.map((s) => (
                  <DropdownMenuRadioItem key={s} value={s}>
                    {leadStageMeta[s].label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="gap-2"
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmOpen(true);
                }}
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          {assignedTo ? (
            <Avatar size="sm">
              <AvatarImage
                src={assignedTo.avatarUrl ?? undefined}
                alt={assignedTo.name ?? assignedTo.email}
              />
              <AvatarFallback color={colorFor(assignedTo.id)} className="text-[9px]">
                {initials(assignedTo.name ?? assignedTo.email)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="text-muted-foreground font-mono text-[10px]">unassigned</span>
          )}
          <span className="text-muted-foreground text-[11px]">
            {formatDistanceToNow(updatedAt, { addSuffix: false })}
          </span>
        </div>
      </article>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Moved to trash. You can restore within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

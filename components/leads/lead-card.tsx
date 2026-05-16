"use client";

import { formatDistanceToNow } from "date-fns";
import { Globe, MoreHorizontal, Trash2 } from "lucide-react";
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

  return (
    <>
      <article className="group bg-card hover:border-border/80 border-border relative flex flex-col gap-2 rounded-lg border p-3 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/leads/${id}`}
            className="min-w-0 flex-1 text-sm font-medium hover:underline"
          >
            {name}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                disabled={isPending}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-muted-foreground text-[10px] tracking-wide uppercase">
                Move to
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={status}
                onValueChange={(v) => changeStatus(v as LeadCardProps["status"])}
              >
                <DropdownMenuRadioItem value="DISCOVERY">Discovery</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="QUALIFIED">Qualified</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="DEMO">Demo</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="PROPOSAL">Proposal</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="CLOSED">Closed</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive gap-2"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {(companyName || companyWebsite) && (
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            {companyWebsite && <Globe className="h-3 w-3" />}
            <span className="truncate">
              {companyName ?? (companyWebsite ? hostFromUrl(companyWebsite) : null)}
            </span>
          </div>
        )}

        <div className="mt-1 flex items-center justify-between">
          <span className="text-muted-foreground font-mono text-[10px]">
            {formatDistanceToNow(updatedAt, { addSuffix: true })}
          </span>
          {assignedTo ? (
            <Avatar className="h-5 w-5">
              <AvatarImage
                src={assignedTo.avatarUrl ?? undefined}
                alt={assignedTo.name ?? assignedTo.email}
              />
              <AvatarFallback className="text-[9px]">
                {initials(assignedTo.name ?? assignedTo.email)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="text-muted-foreground font-mono text-[10px]">unassigned</span>
          )}
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

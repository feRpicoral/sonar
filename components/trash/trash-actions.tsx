"use client";

import { RotateCcw, Trash2 } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  emptyTrashAction,
  permanentlyDeleteLeadAction,
  restoreLeadAction,
} from "@/lib/leads/restore";

export function TrashRowActions({
  leadId,
  name,
  canPurge,
}: {
  leadId: string;
  name: string;
  canPurge: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const onRestore = () =>
    startTransition(async () => {
      const result = await restoreLeadAction(leadId);
      if (result.error) toast.error(result.error);
      else toast.success(`Restored ${name}`);
    });

  const onDelete = () =>
    startTransition(async () => {
      const result = await permanentlyDeleteLeadAction(leadId);
      if (result.error) toast.error(result.error);
      else toast.success(`Permanently deleted ${name}`);
      setConfirmOpen(false);
    });

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="xs" onClick={onRestore} disabled={isPending}>
        <RotateCcw />
        {isPending ? "Restoring…" : "Restore"}
      </Button>
      {canPurge && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="text-rose-fg" disabled={isPending}>
              <Trash2 />
              <span className="sr-only">Delete permanently</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete {name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the lead and its calls and runs for good. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                disabled={isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isPending ? "Deleting…" : "Delete forever"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export function EmptyTrashButton() {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const onEmpty = () =>
    startTransition(async () => {
      const result = await emptyTrashAction();
      if (result.error) toast.error(result.error);
      else toast.success(`Emptied trash (${result.deletedCount ?? 0})`);
      setOpen(false);
    });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-rose-fg border-rose-bd hover:bg-rose-bg"
        >
          <Trash2 />
          Empty trash
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Empty trash?</AlertDialogTitle>
          <AlertDialogDescription>
            Permanently deletes every trashed lead and its calls and runs. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onEmpty}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Emptying…" : "Empty trash"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

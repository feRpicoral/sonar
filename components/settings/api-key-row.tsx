"use client";

import { formatDistanceToNow } from "date-fns";
import { KeyRound, MoreHorizontal, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { revokeApiKeyAction } from "@/lib/api-keys/actions";

export interface ApiKeyRowProps {
  id: string;
  name: string;
  last4: string;
  scopes: string[];
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
  canManage: boolean;
}

export function ApiKeyRow({
  id,
  name,
  last4,
  scopes,
  lastUsedAt,
  createdAt,
  revokedAt,
  canManage,
}: ApiKeyRowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const revoked = revokedAt !== null;

  const onRevoke = () => {
    startTransition(async () => {
      const result = await revokeApiKeyAction(id);
      if (result.error) toast.error(result.error);
      else toast.success(`Revoked ${name}`);
      setConfirmOpen(false);
    });
  };

  return (
    <>
      <div className="border-border grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b px-4 py-3 last:border-b-0">
        <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-md" aria-hidden>
          <KeyRound className="text-muted-foreground h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="text-muted-foreground font-mono text-[10px]">sk_…{last4}</span>
            {revoked && (
              <Badge variant="destructive" className="font-mono text-[10px]">
                revoked
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {scopes.map((s) => (
              <Badge key={s} variant="outline" className="font-mono text-[9px]">
                {s}
              </Badge>
            ))}
          </div>
          <p className="text-muted-foreground font-mono text-[10px]">
            {lastUsedAt
              ? `last used ${formatDistanceToNow(lastUsedAt, { addSuffix: true })}`
              : "never used"}
            {" , "}
            created {formatDistanceToNow(createdAt, { addSuffix: true })}
          </p>
        </div>
        {canManage && !revoked && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isPending}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive gap-2"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Revoke
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Any integration using this key will start receiving 401 responses immediately. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={onRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Revoking…" : "Revoke key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

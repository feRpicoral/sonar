"use client";

import { MailQuestion, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revokeInviteAction } from "@/lib/invites/actions";

export interface InviteRowProps {
  id: string;
  email: string | null;
  role: "ADMIN" | "MEMBER";
  expiresAt: Date;
}

function relativeDays(target: Date): string {
  const ms = target.getTime() - Date.now();
  const days = Math.round(ms / 86_400_000);
  if (days <= 0) return "expired";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

export function InviteRow({ id, email, role, expiresAt }: InviteRowProps) {
  const [isPending, startTransition] = useTransition();

  const onRevoke = () => {
    startTransition(async () => {
      const result = await revokeInviteAction(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Invite revoked");
    });
  };

  return (
    <div className="border-border flex items-center justify-between border-b py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
          <MailQuestion className="text-muted-foreground h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{email ?? "Anyone with link"}</div>
          <div className="text-muted-foreground text-xs">Expires {relativeDays(expiresAt)}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="font-mono text-[10px]">
          {role.toLowerCase()}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={onRevoke}
          disabled={isPending}
        >
          <X className="h-3.5 w-3.5" />
          {isPending ? "Revoking" : "Revoke"}
        </Button>
      </div>
    </div>
  );
}

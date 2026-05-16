"use client";

import { MoreHorizontal, ShieldCheck, Trash2, UserCog } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { changeMemberRoleAction, removeMemberAction } from "@/lib/invites/actions";

export interface MemberRowProps {
  id: string;
  role: "ADMIN" | "MEMBER";
  user: { id: string; name: string | null; email: string; avatarUrl: string | null };
  isSelf: boolean;
  canManage: boolean;
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

export function MemberRow({ id, role, user, isSelf, canManage }: MemberRowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onChangeRole = (next: "ADMIN" | "MEMBER") => {
    if (next === role) return;
    startTransition(async () => {
      const result = await changeMemberRoleAction(id, next);
      if (result.error) toast.error(result.error);
      else toast.success(`Updated role to ${next.toLowerCase()}`);
    });
  };

  const onRemove = () => {
    startTransition(async () => {
      const result = await removeMemberAction(id);
      if (result.error) toast.error(result.error);
      else toast.success(`Removed ${user.name ?? user.email}`);
      setConfirmOpen(false);
    });
  };

  return (
    <>
      <div className="border-border flex items-center justify-between border-b py-3 last:border-b-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name ?? user.email} />
            <AvatarFallback className="text-xs">{initials(user.name ?? user.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="truncate font-medium">{user.name ?? user.email}</span>
              {isSelf && <span className="text-muted-foreground text-xs">(you)</span>}
            </div>
            {user.name && (
              <div className="text-muted-foreground truncate text-xs">{user.email}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={role === "ADMIN" ? "default" : "secondary"}
            className="font-mono text-[10px]"
          >
            {role.toLowerCase()}
          </Badge>
          {canManage && !isSelf && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isPending}>
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {role === "MEMBER" ? (
                  <DropdownMenuItem className="gap-2" onClick={() => onChangeRole("ADMIN")}>
                    <ShieldCheck className="h-4 w-4" /> Make admin
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="gap-2" onClick={() => onChangeRole("MEMBER")}>
                    <UserCog className="h-4 w-4" /> Make member
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive gap-2"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4" /> Remove from workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {user.name ?? user.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They lose access immediately. Any leads they own will remain assigned to them until
              reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={onRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Removing…" : "Remove member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

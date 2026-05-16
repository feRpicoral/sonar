"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchOrgAction } from "@/lib/auth/switch-org";

export interface OrgItem {
  id: string;
  name: string;
  slug: string;
  role: "ADMIN" | "MEMBER";
}

export function WorkspaceSwitcher({ current, orgs }: { current: OrgItem; orgs: OrgItem[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-2" disabled={isPending}>
          <span className="flex items-center gap-2 truncate">
            <span className="bg-primary/10 text-primary flex h-5 w-5 items-center justify-center rounded font-mono text-[10px] font-semibold uppercase">
              {current.name.charAt(0)}
            </span>
            <span className="truncate text-sm">{current.name}</span>
          </span>
          <ChevronsUpDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-muted-foreground text-xs">Workspaces</DropdownMenuLabel>
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            className="flex items-center justify-between"
            onClick={() => {
              if (org.id === current.id) return;
              startTransition(async () => {
                const result = await switchOrgAction(org.id);
                if (result?.error) toast.error(result.error);
              });
            }}
          >
            <span className="truncate">{org.name}</span>
            {org.id === current.id && <Check className="text-primary h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/create-org" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchOrgAction } from "@/lib/auth/switch-org";
import { cn } from "@/lib/utils";

export interface OrgItem {
  id: string;
  name: string;
  slug: string;
  role: "ADMIN" | "MEMBER";
}

const LOGO_COLORS = ["bg-primary", "bg-emerald-solid", "bg-amber-solid", "bg-rose-solid"];

function logoColor(index: number) {
  return LOGO_COLORS[index % LOGO_COLORS.length];
}

function roleLabel(role: OrgItem["role"]) {
  return role === "ADMIN" ? "Admin" : "Member";
}

export function WorkspaceSwitcher({
  current,
  orgs,
  onNavigate,
}: {
  current: OrgItem;
  orgs: OrgItem[];
  onNavigate?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isPending}
          className="border-border bg-card hover:border-border-strong focus-visible:ring-ring/50 flex h-11 w-full items-center gap-2.5 rounded-[9px] border px-2.5 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:opacity-60"
        >
          <span className="bg-primary text-primary-foreground flex size-[26px] shrink-0 items-center justify-center rounded-[7px] text-[13px] font-bold">
            {current.name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold">{current.name}</span>
            <span className="text-muted-foreground block truncate text-[11px]">
              {roleLabel(current.role)} · {current.slug}
            </span>
          </span>
          <ChevronsUpDown className="text-muted-foreground size-[15px] shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-muted-foreground font-mono text-[9.5px] tracking-wider uppercase">
          Workspaces
        </DropdownMenuLabel>
        {orgs.map((org, i) => {
          const active = org.id === current.id;
          return (
            <DropdownMenuItem
              key={org.id}
              className="gap-2"
              onClick={() => {
                if (active) return;
                startTransition(async () => {
                  const result = await switchOrgAction(org.id);
                  if (result?.error) toast.error(result.error);
                  else onNavigate?.();
                });
              }}
            >
              <span
                className={cn(
                  "flex size-[22px] shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white",
                  logoColor(i),
                )}
              >
                {org.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{org.name}</span>
              <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                {roleLabel(org.role)}
              </span>
              {active && <Check className="text-primary size-3.5 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/create-org" className="gap-2" onClick={onNavigate}>
            <Plus className="size-3.5" />
            Create workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useTransition } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { signOutAction } from "@/lib/auth/actions";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export function UserMenu({
  user,
}: {
  user: { email: string; name: string | null; avatarUrl: string | null };
}) {
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  const displayName = user.name ?? user.email;
  const initials =
    displayName
      .split(/[\s@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase())
      .join("") || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="border-border bg-card hover:border-border-strong focus-visible:ring-ring/50 flex h-[46px] w-full items-center gap-2.5 rounded-[9px] border px-2.5 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <Avatar size="sm">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={displayName} />
            <AvatarFallback color="solid" className="text-[11px]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-[550]">{displayName}</span>
            <span className="text-muted-foreground block truncate text-[11px]">{user.email}</span>
          </span>
          <ChevronsUpDown className="text-muted-foreground size-[15px] shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-60">
        <div className="px-2 py-1.5">
          <p className="truncate text-[13px] font-semibold">{displayName}</p>
          <p className="text-muted-foreground truncate text-[11.5px]">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="text-[13px]">Theme</span>
          <Segmented className="p-0.5">
            {THEMES.map((t) => (
              <SegmentedItem
                key={t.value}
                active={theme === t.value}
                className="h-6 px-2.5 text-[12px]"
                onClick={() => setTheme(t.value)}
              >
                {t.label}
              </SegmentedItem>
            ))}
          </Segmented>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          disabled={isPending}
          onSelect={(e) => {
            e.preventDefault();
            startTransition(() => signOutAction());
          }}
        >
          <LogOut className="size-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

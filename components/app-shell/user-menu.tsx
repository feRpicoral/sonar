"use client";

import { LogOut, MoonStar, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTransition } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/auth/actions";

export function UserMenu({
  user,
}: {
  user: { email: string; name: string | null; avatarUrl: string | null };
}) {
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  const initials =
    (user.name ?? user.email)
      .split(/[\s@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase())
      .join("") || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2 px-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name ?? user.email} />
            <AvatarFallback className="text-[10px] font-medium">{initials}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm">{user.name ?? user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-56">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          disabled={isPending}
          onClick={() => startTransition(() => signOutAction())}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

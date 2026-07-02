"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { SidebarBody, type SidebarUser } from "./sidebar";
import type { OrgItem } from "./workspace-switcher";

export function MobileTopbar({
  current,
  orgs,
  user,
  leadsCount,
  className,
}: {
  current: OrgItem;
  orgs: OrgItem[];
  user: SidebarUser;
  leadsCount?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "bg-card border-border sticky top-0 z-30 flex h-[54px] items-center justify-between gap-2.5 border-b px-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden />
        <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          Sonar
        </span>
        <span className="text-muted-foreground/60 text-xs">/</span>
        <span className="truncate text-sm font-semibold">{current.name}</span>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon-sm" aria-label="Open menu">
            <Menu className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="bg-bg-subtle flex w-72 flex-col p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody current={current} orgs={orgs} user={user} leadsCount={leadsCount} />
        </SheetContent>
      </Sheet>
    </header>
  );
}

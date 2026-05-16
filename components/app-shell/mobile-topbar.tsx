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
  className,
}: {
  current: OrgItem;
  orgs: OrgItem[];
  user: SidebarUser;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "bg-card border-border sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-2.5",
        className,
      )}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-60 flex-col p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody current={current} orgs={orgs} user={user} />
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2">
        <span className="bg-primary h-1.5 w-1.5 rounded-full" aria-hidden />
        <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          Sonar
        </span>
        <span className="text-muted-foreground/60 text-xs">/</span>
        <span className="truncate text-sm font-medium">{current.name}</span>
      </div>
    </header>
  );
}

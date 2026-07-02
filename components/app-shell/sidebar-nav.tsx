"use client";

import { Activity, LayoutGrid, Settings as SettingsIcon, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, match: undefined, count: undefined },
  { href: "/leads", label: "Leads", icon: Users, match: "/leads", count: "leads" },
  { href: "/runs", label: "Runs", icon: Activity, match: "/runs", count: undefined },
  { href: "/trash", label: "Trash", icon: Trash2, match: "/trash", count: undefined },
  {
    href: "/settings/members",
    label: "Settings",
    icon: SettingsIcon,
    match: "/settings",
    count: undefined,
  },
] as const;

export function SidebarNav({
  leadsCount,
  onNavigate,
}: {
  leadsCount?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-1">
      <p className="text-muted-foreground mb-1.5 px-2.5 font-mono text-[9.5px] tracking-wider uppercase">
        Workspace
      </p>
      <div className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const matches = item.match ? pathname.startsWith(item.match) : pathname === item.href;
          const count = item.count === "leads" ? leadsCount : undefined;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={matches ? "page" : undefined}
              className={cn(
                "flex h-[34px] items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors",
                matches
                  ? "bg-muted text-foreground font-[550]"
                  : "text-fg-2 hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  matches ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="flex-1">{item.label}</span>
              {count != null && (
                <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

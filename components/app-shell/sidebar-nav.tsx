"use client";

import { Activity, LayoutGrid, Settings as SettingsIcon, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, match: undefined },
  { href: "/leads", label: "Leads", icon: Users, match: "/leads" },
  { href: "/runs", label: "Runs", icon: Activity, match: "/runs" },
  { href: "/trash", label: "Trash", icon: Trash2, match: "/trash" },
  { href: "/settings/members", label: "Settings", icon: SettingsIcon, match: "/settings" },
] as const;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 px-3 py-2">
      {NAV.map((item) => {
        const Icon = item.icon;
        const matches = item.match ? pathname.startsWith(item.match) : pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              matches
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

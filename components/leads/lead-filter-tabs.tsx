"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { value: "all", label: "All" },
  { value: "my", label: "My leads" },
  { value: "unassigned", label: "Unassigned" },
] as const;

export function LeadFilterTabs() {
  const params = useSearchParams();
  const current = params.get("filter") ?? "all";

  return (
    <nav className="bg-muted inline-flex rounded-md p-0.5">
      {TABS.map((tab) => {
        const active = current === tab.value;
        const href = tab.value === "all" ? "/leads" : `/leads?filter=${tab.value}`;
        return (
          <Link
            key={tab.value}
            href={href}
            scroll={false}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "All", prefix: null },
  { value: "lead", label: "Leads", prefix: "lead." },
  { value: "run", label: "Runs", prefix: "run." },
  { value: "email", label: "Emails", prefix: "email." },
  { value: "member", label: "Members", prefix: "member." },
  { value: "api_key", label: "API keys", prefix: "api_key." },
  { value: "webhook", label: "Webhooks", prefix: "webhook." },
] as const;

export function AuditLogFilters() {
  const params = useSearchParams();
  const current = params.get("filter") ?? "all";

  return (
    <nav className="bg-muted inline-flex flex-wrap gap-0.5 rounded-md p-0.5">
      {FILTERS.map((tab) => {
        const active = current === tab.value;
        const href =
          tab.value === "all" ? "/settings/audit-log" : `/settings/audit-log?filter=${tab.value}`;
        return (
          <Link
            key={tab.value}
            href={href}
            scroll={false}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
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

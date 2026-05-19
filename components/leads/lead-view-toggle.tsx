"use client";

import { LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

import { buildLeadsHref } from "./leads-href";

const VIEWS = [
  { value: "board", label: "Board", icon: LayoutGrid },
  { value: "list", label: "List", icon: List },
] as const;

export type LeadView = (typeof VIEWS)[number]["value"];

export function LeadViewToggle() {
  const params = useSearchParams();
  const current: LeadView = params.get("view") === "list" ? "list" : "board";

  return (
    <nav className="bg-muted inline-flex rounded-md p-0.5" aria-label="View">
      {VIEWS.map((view) => {
        const Icon = view.icon;
        const active = current === view.value;
        const href = buildLeadsHref(params, {
          view: view.value === "board" ? null : view.value,
        });
        return (
          <Link
            key={view.value}
            href={href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{view.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

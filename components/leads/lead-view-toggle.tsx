"use client";

import { Columns2, List } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Segmented, SegmentedItem } from "@/components/ui/segmented";

import { buildLeadsHref } from "./leads-href";

const VIEWS = [
  { value: "list", label: "Table view", icon: List },
  { value: "board", label: "Board view", icon: Columns2 },
] as const;

export type LeadView = (typeof VIEWS)[number]["value"];

export function LeadViewToggle() {
  const params = useSearchParams();
  const current: LeadView = params.get("view") === "list" ? "list" : "board";

  return (
    <Segmented aria-label="View">
      {VIEWS.map((view) => {
        const Icon = view.icon;
        return (
          <SegmentedItem key={view.value} asChild active={current === view.value} className="px-2">
            <Link
              href={buildLeadsHref(params, { view: view.value === "board" ? null : view.value })}
              scroll={false}
              aria-label={view.label}
            >
              <Icon />
            </Link>
          </SegmentedItem>
        );
      })}
    </Segmented>
  );
}

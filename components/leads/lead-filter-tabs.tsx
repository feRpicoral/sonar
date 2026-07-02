"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Segmented, SegmentedCount, SegmentedItem } from "@/components/ui/segmented";

import { buildLeadsHref } from "./leads-href";

const TABS = [
  { value: "all", label: "All", key: "all" },
  { value: "my", label: "My leads", key: "my" },
  { value: "unassigned", label: "Unassigned", key: "unassigned" },
] as const;

export function LeadFilterTabs({
  counts,
}: {
  counts: { all: number; my: number; unassigned: number };
}) {
  const params = useSearchParams();
  const current = params.get("filter") ?? "all";

  return (
    <Segmented>
      {TABS.map((tab) => (
        <SegmentedItem key={tab.value} asChild active={current === tab.value}>
          <Link
            href={buildLeadsHref(params, { filter: tab.value === "all" ? null : tab.value })}
            scroll={false}
          >
            {tab.label}
            <SegmentedCount>{counts[tab.key]}</SegmentedCount>
          </Link>
        </SegmentedItem>
      ))}
    </Segmented>
  );
}

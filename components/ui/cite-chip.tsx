import * as React from "react";

import { cn } from "@/lib/utils";

function CiteChip({
  className,
  active = false,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      data-slot="cite-chip"
      data-active={active}
      className={cn(
        "relative -top-px inline-flex h-4 min-w-4 cursor-pointer items-center justify-center rounded-[4px] border px-1 align-middle font-mono text-[10px] font-semibold transition",
        active
          ? "border-primary bg-primary text-primary-foreground ring-ring/50 ring-[3px]"
          : "border-violet-bd bg-violet-bg text-violet-fg hover:brightness-95",
        className,
      )}
      {...props}
    />
  );
}

function CitedBadge({
  className,
  active = false,
  count,
}: {
  className?: string;
  active?: boolean;
  count?: number;
}) {
  return (
    <span
      data-slot="cited-badge"
      className={cn(
        "inline-flex h-[18px] items-center gap-1 rounded-[5px] border px-1.5 font-mono text-[10px] font-semibold tracking-wide whitespace-nowrap",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-violet-bd bg-violet-bg text-violet-fg",
        className,
      )}
    >
      CITED{count != null ? ` · ${count}` : ""}
    </span>
  );
}

export { CiteChip, CitedBadge };

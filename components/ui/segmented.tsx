import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

function Segmented({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="segmented"
      className={cn(
        "border-border bg-muted inline-flex items-center gap-0.5 rounded-[9px] border p-[3px]",
        className,
      )}
      {...props}
    />
  );
}

function SegmentedItem({
  className,
  active = false,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  active?: boolean;
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      type={asChild ? undefined : "button"}
      data-slot="segmented-item"
      data-active={active}
      className={cn(
        "text-fg-3 inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-[11px] text-[13px] font-medium whitespace-nowrap transition-colors [&>svg]:size-[15px]",
        active
          ? "bg-card text-foreground font-[550] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
          : "hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SegmentedCount({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground font-mono text-[11px]">{children}</span>;
}

export { Segmented, SegmentedCount, SegmentedItem };

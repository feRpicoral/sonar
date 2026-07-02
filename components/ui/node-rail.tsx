import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const markerVariants = cva(
  "bg-card inline-flex size-6 shrink-0 items-center justify-center rounded-full border [&>svg]:size-[13px]",
  {
    variants: {
      variant: {
        default: "border-border-strong text-muted-foreground",
        emerald: "border-emerald-bd bg-emerald-bg text-emerald-fg",
        violet: "border-violet-fg bg-violet-bg text-violet-fg",
        rose: "border-rose-bd bg-rose-bg text-rose-fg",
        zinc: "border-zinc-bd bg-zinc-bg text-zinc-fg",
        dashed: "border-border-strong bg-bg-subtle text-fg-3 border-dashed",
      },
      pulse: { true: "animate-sonar-pulse", false: "" },
    },
    defaultVariants: { variant: "default", pulse: false },
  },
);

function Marker({
  className,
  variant,
  pulse,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof markerVariants>) {
  return (
    <span
      data-slot="marker"
      className={cn(markerVariants({ variant, pulse }), className)}
      {...props}
    />
  );
}

function NodeRow({
  marker,
  children,
  last = false,
  line = "default",
  className,
}: {
  marker: React.ReactNode;
  children: React.ReactNode;
  last?: boolean;
  line?: "default" | "emerald" | "muted";
  className?: string;
}) {
  return (
    <div data-slot="node-row" className={cn("flex gap-3.5", className)}>
      <div className="flex w-6 flex-none flex-col items-center">
        {marker}
        {!last && (
          <div
            className={cn(
              "my-1 min-h-3.5 w-0.5 flex-1 rounded-full",
              line === "emerald"
                ? "bg-emerald-bd"
                : line === "muted"
                  ? "bg-border"
                  : "bg-border-strong",
            )}
          />
        )}
      </div>
      <div className="min-w-0 flex-1 pb-4">{children}</div>
    </div>
  );
}

export { Marker, markerVariants, NodeRow };

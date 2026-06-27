import { cva, type VariantProps } from "class-variance-authority";
import { Info, type LucideIcon, TriangleAlert } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const calloutVariants = cva(
  "flex gap-[11px] rounded-[10px] border-l-[3px] px-3.5 py-3 text-[13px] leading-relaxed [&>svg]:mt-px [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        info: "border-l-primary bg-[color-mix(in_oklch,var(--violet-bg)_55%,var(--background))] text-violet-fg [&>svg]:text-violet-fg",
        warning:
          "border-l-amber-solid bg-[color-mix(in_oklch,var(--amber-bg)_50%,var(--background))] text-amber-fg [&>svg]:text-amber-fg",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

function Callout({
  className,
  variant = "info",
  icon,
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof calloutVariants> & { icon?: LucideIcon }) {
  const Icon = icon ?? (variant === "warning" ? TriangleAlert : Info);
  return (
    <div data-slot="callout" className={cn(calloutVariants({ variant }), className)} {...props}>
      <Icon aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export { Callout, calloutVariants };

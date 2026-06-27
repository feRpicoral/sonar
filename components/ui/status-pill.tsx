import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const pillVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border leading-none font-medium whitespace-nowrap [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        emerald: "border-emerald-bd bg-emerald-bg text-emerald-fg",
        amber: "border-amber-bd bg-amber-bg text-amber-fg",
        rose: "border-rose-bd bg-rose-bg text-rose-fg",
        violet: "border-violet-bd bg-violet-bg text-violet-fg",
        zinc: "border-zinc-bd bg-zinc-bg text-zinc-fg",
        dashed: "border-border-strong bg-bg-subtle text-fg-3 border-dashed",
      },
      size: {
        default: "h-[22px] px-2 text-xs",
        lg: "h-[26px] rounded-[7px] px-[11px] text-[13px] font-semibold [&>svg]:size-[13px]",
      },
      strong: {
        true: "font-semibold",
        false: "",
      },
    },
    defaultVariants: { variant: "zinc", size: "default", strong: false },
  },
);

export type PillVariant = NonNullable<VariantProps<typeof pillVariants>["variant"]>;

export interface StatusDescriptor {
  label: string;
  variant: PillVariant;
  icon: LucideIcon;
  spin?: boolean;
  strong?: boolean;
}

function Pill({
  className,
  variant,
  size,
  strong,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof pillVariants>) {
  return (
    <span
      data-slot="pill"
      className={cn(pillVariants({ variant, size, strong }), className)}
      {...props}
    />
  );
}

function StatusPill({
  descriptor,
  size,
  className,
}: {
  descriptor: StatusDescriptor;
  size?: VariantProps<typeof pillVariants>["size"];
  className?: string;
}) {
  const { icon: Icon, label, variant, spin, strong } = descriptor;
  return (
    <Pill variant={variant} size={size} strong={strong} className={className}>
      <Icon className={cn(spin && "animate-spin")} aria-hidden />
      {label}
    </Pill>
  );
}

const dotVariants = cva("inline-block size-[7px] shrink-0 rounded-full", {
  variants: {
    stage: {
      discovery: "bg-dot-discovery",
      qualified: "bg-dot-qualified",
      demo: "bg-dot-demo",
      proposal: "bg-dot-proposal",
      closed: "bg-dot-closed",
    },
  },
  defaultVariants: { stage: "discovery" },
});

export type StageKey = NonNullable<VariantProps<typeof dotVariants>["stage"]>;

function Dot({ stage, className }: VariantProps<typeof dotVariants> & { className?: string }) {
  return <span className={cn(dotVariants({ stage }), className)} aria-hidden />;
}

function DotPill({
  stage,
  children,
  className,
}: {
  stage: StageKey;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      data-slot="dot-pill"
      className={cn(
        "border-border bg-muted text-fg-2 inline-flex h-6 w-fit items-center gap-[7px] rounded-md border px-2.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      <Dot stage={stage} />
      {children}
    </span>
  );
}

export { Dot, DotPill, Pill, pillVariants, StatusPill };

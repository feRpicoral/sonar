import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

const SPARK_MIN = 8;
const SPARK_MAX = 30;

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-[34px] items-end gap-[3px]" aria-hidden>
      {data.map((value, i) => {
        const height = SPARK_MIN + (value / max) * (SPARK_MAX - SPARK_MIN);
        const isLast = i === data.length - 1;
        return (
          <span
            key={i}
            className={cn("w-1.5 rounded-[2px]", isLast ? "bg-primary" : "bg-muted")}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  delta?: { label: string; direction?: "up" | "down" };
  data?: number[];
  href?: string;
  className?: string;
}

export function MetricCard({ label, value, delta, data, href, className }: MetricCardProps) {
  const DeltaIcon = delta?.direction === "down" ? TrendingDown : TrendingUp;
  const inner = (
    <div
      className={cn(
        "bg-card border-border shadow-panel rounded-xl border px-[18px] py-4",
        href && "hover:border-border-strong transition-colors",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-[11px] tracking-wide uppercase">
          {label}
        </span>
        {href && <ArrowUpRight className="text-muted-foreground size-3.5" aria-hidden />}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3.5">
        <div>
          <div className="text-[30px] leading-none font-semibold tracking-tight tabular-nums">
            {value}
          </div>
          {delta && (
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium",
                delta.direction === "down" ? "text-rose-fg" : "text-emerald-fg",
              )}
            >
              <DeltaIcon className="size-3" aria-hidden />
              {delta.label}
            </div>
          )}
        </div>
        {data && data.length > 0 && <Sparkline data={data} />}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

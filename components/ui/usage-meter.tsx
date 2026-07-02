import { cn } from "@/lib/utils";

const NEAR_LIMIT_PCT = 80;

export function UsageMeter({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const nearLimit = pct >= NEAR_LIMIT_PCT;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("bg-muted h-2 w-full overflow-hidden rounded-full", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all",
          nearLimit ? "bg-amber-solid" : "bg-primary",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

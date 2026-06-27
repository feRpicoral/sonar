const DAY_MS = 86_400_000;
const WINDOW_DAYS = 14;
const SPARK_DAYS = 10;
const WEEK_DAYS = 7;

export interface MetricSummary {
  total: number;
  sparkline: number[];
  delta: { label: string; direction: "up" | "down" };
}

/** Buckets timestamps into day counts where index 0 is today and 13 is 14 days ago. */
function bucketByDay(dates: Date[], now: number): number[] {
  const buckets = new Array<number>(WINDOW_DAYS).fill(0);
  for (const date of dates) {
    const dayIndex = Math.floor((now - date.getTime()) / DAY_MS);
    if (dayIndex >= 0 && dayIndex < WINDOW_DAYS) {
      buckets[dayIndex] = (buckets[dayIndex] ?? 0) + 1;
    }
  }
  return buckets;
}

export function summarizeMetric(total: number, dates: Date[], now: number): MetricSummary {
  const buckets = bucketByDay(dates, now);
  const chronological = [...buckets].reverse();
  const sparkline = chronological.slice(WINDOW_DAYS - SPARK_DAYS);

  let thisWeek = 0;
  let priorWeek = 0;
  for (let i = 0; i < WINDOW_DAYS; i++) {
    if (i < WEEK_DAYS) thisWeek += buckets[i] ?? 0;
    else priorWeek += buckets[i] ?? 0;
  }

  const direction: "up" | "down" = thisWeek >= priorWeek ? "up" : "down";
  const label =
    priorWeek > 0
      ? `${Math.round((Math.abs(thisWeek - priorWeek) / priorWeek) * 100)}% this week`
      : `${thisWeek} this week`;

  return { total, sparkline, delta: { label, direction } };
}

export const METRICS_WINDOW_DAYS = WINDOW_DAYS;
export const METRICS_DAY_MS = DAY_MS;

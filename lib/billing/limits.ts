import type { SubscriptionPlan } from "@prisma/client";

export const FREE_RUN_LIMIT = 20;

/** Monthly agent-run cap for a plan; null means unlimited (Pro). */
export function runLimitFor(plan: SubscriptionPlan): number | null {
  return plan === "PRO" ? null : FREE_RUN_LIMIT;
}

export function isAtRunLimit(plan: SubscriptionPlan, used: number): boolean {
  const limit = runLimitFor(plan);
  return limit !== null && used >= limit;
}

/** First day of the current UTC month — the window agent-run usage is counted over. */
export function monthStart(now: number): Date {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

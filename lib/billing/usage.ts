import "server-only";

import type { SubscriptionPlan } from "@prisma/client";

import type { OrgId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

import { isAtRunLimit, monthStart, runLimitFor } from "./limits";

export interface RunUsage {
  plan: SubscriptionPlan;
  used: number;
  limit: number | null;
  atLimit: boolean;
}

export async function getRunUsage(orgId: OrgId): Promise<RunUsage> {
  const db = getDb(orgId);
  const [sub, used] = await Promise.all([
    db.subscription.findUnique({ where: { orgId }, select: { plan: true } }),
    db.agentRun.count({ where: { startedAt: { gte: monthStart(Date.now()) } } }),
  ]);
  const plan = sub?.plan ?? "FREE";
  return { plan, used, limit: runLimitFor(plan), atLimit: isAtRunLimit(plan, used) };
}

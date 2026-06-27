import "server-only";

import type { OrgId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

import {
  METRICS_DAY_MS,
  METRICS_WINDOW_DAYS,
  type MetricSummary,
  summarizeMetric,
} from "./summary";

export interface DashboardMetrics {
  leads: MetricSummary;
  calls: MetricSummary;
  runs: MetricSummary;
}

export async function getDashboardMetrics(orgId: OrgId): Promise<DashboardMetrics> {
  const db = getDb(orgId);
  const now = Date.now();
  const since = new Date(now - METRICS_WINDOW_DAYS * METRICS_DAY_MS);

  const [leadTotal, callTotal, runTotal, leadDates, callDates, runDates] = await Promise.all([
    db.lead.count({ where: { deletedAt: null } }),
    db.call.count({ where: { deletedAt: null } }),
    db.agentRun.count(),
    db.lead.findMany({
      where: { deletedAt: null, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    db.call.findMany({
      where: { deletedAt: null, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    db.agentRun.findMany({ where: { startedAt: { gte: since } }, select: { startedAt: true } }),
  ]);

  return {
    leads: summarizeMetric(
      leadTotal,
      leadDates.map((l) => l.createdAt),
      now,
    ),
    calls: summarizeMetric(
      callTotal,
      callDates.map((c) => c.createdAt),
      now,
    ),
    runs: summarizeMetric(
      runTotal,
      runDates.map((r) => r.startedAt),
      now,
    ),
  };
}

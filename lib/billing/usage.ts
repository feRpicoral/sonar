import "server-only";

import type { SubscriptionPlan } from "@prisma/client";

import { getPrisma } from "@/lib/db/client";
import type { OrgId, UserId } from "@/lib/db/types";
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

export class RunLimitReachedError extends Error {
  constructor(readonly limit: number) {
    super(`Free plan monthly run limit (${limit}) reached`);
  }
}

export async function createAgentRunWithinLimit({
  orgId,
  leadId,
  callId,
  createdByUserId,
}: {
  orgId: OrgId;
  leadId: string;
  callId: string | null;
  createdByUserId: UserId | string;
}): Promise<{ id: string }> {
  const prisma = getPrisma();
  const now = Date.now();

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id FROM organizations
      WHERE id = ${orgId}::uuid
      FOR UPDATE
    `;

    const sub = await tx.subscription.findUnique({
      where: { orgId },
      select: { plan: true },
    });
    const plan = sub?.plan ?? "FREE";
    const limit = runLimitFor(plan);
    if (limit !== null) {
      const used = await tx.agentRun.count({
        where: { orgId, startedAt: { gte: monthStart(now) } },
      });
      if (used >= limit) throw new RunLimitReachedError(limit);
    }

    return tx.agentRun.create({
      data: {
        orgId,
        leadId,
        callId,
        status: "PENDING",
        createdByUserId,
      },
      select: { id: true },
    });
  });
}

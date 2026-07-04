"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { runAgent } from "@/lib/agents/runner";
import { writeAudit } from "@/lib/audit/log";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getRunUsage } from "@/lib/billing/usage";
import { asRunId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

export async function retryRunAction(runId: string): Promise<{ error?: string }> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const usage = await getRunUsage(session.orgId);
  if (usage.atLimit) {
    return {
      error: `You've used all ${usage.limit} agent runs on the Free plan this month. Upgrade to Pro for unlimited runs.`,
    };
  }

  // Only failed or cancelled runs may be retried. Re-running a COMPLETED run
  // (email already sent) or one AWAITING_APPROVAL would rewrite its email draft
  // and reset a SENT draft back to DRAFT, corrupting the send record and
  // allowing a duplicate send.
  const claim = await db.agentRun.updateMany({
    where: { id: runId, status: { in: ["FAILED", "CANCELLED"] } },
    data: { status: "PENDING", completedAt: null },
  });
  if (claim.count === 0) {
    const run = await db.agentRun.findUnique({
      where: { id: runId },
      select: { id: true, status: true },
    });
    if (!run) return { error: "Run not found" };
    return { error: "Only failed or cancelled runs can be retried" };
  }

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "run.started",
    targetType: "run",
    targetId: asRunId(runId),
    metadata: { retry: true },
  });

  after(async () => {
    try {
      await runAgent(runId);
    } catch (err) {
      console.error(`AgentRun ${runId} retry failed:`, err);
    }
  });

  revalidatePath(`/runs/${runId}`);
  return {};
}

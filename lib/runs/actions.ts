"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { runAgent } from "@/lib/agents/runner";
import { writeAudit } from "@/lib/audit/log";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { asRunId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

export async function retryRunAction(runId: string): Promise<{ error?: string }> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const run = await db.agentRun.findUnique({
    where: { id: runId },
    select: { id: true, status: true },
  });
  if (!run) return { error: "Run not found" };
  if (run.status === "RUNNING" || run.status === "PENDING") {
    return { error: "Run is already in progress" };
  }

  await db.agentRun.update({
    where: { id: runId },
    data: { status: "PENDING", completedAt: null },
  });

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

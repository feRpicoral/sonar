import { writeAudit } from "@/lib/audit/log";
import { getPrisma } from "@/lib/db/client";
import { asOrgId, asRunId, asUserId, type OrgId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

import { analysisNode } from "./nodes/analysis";
import { researchNode } from "./nodes/research";
import { strategyNode } from "./nodes/strategy";
import { writerNode } from "./nodes/writer";
import type {
  AgentRunState,
  AnalysisOutput,
  ResearchOutput,
  StrategyOutput,
  WriterOutput,
} from "./state";

type NodeName = "RESEARCH" | "ANALYSIS" | "STRATEGY" | "WRITER";

interface CallContext {
  transcriptText: string | null;
  segments: { start: number; end: number; text: string }[];
}

/**
 * Orchestrate a full agent run end-to-end. Reads the AgentRun row, executes
 * each node in sequence, writes AgentRunStep rows with status + structured
 * output, and finalizes the run with COMPLETED or FAILED.
 */
export async function runAgent(runId: string): Promise<void> {
  const prisma = getPrisma();

  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      orgId: true,
      leadId: true,
      callId: true,
      createdByUserId: true,
      lead: { select: { name: true, companyName: true, companyWebsite: true } },
      call: { select: { transcriptText: true, segments: true } },
    },
  });
  if (!run) throw new Error(`AgentRun ${runId} not found`);

  const orgId = asOrgId(run.orgId);
  const db = getDb(orgId);

  await db.agentRun.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const callContext: CallContext | null = run.call
    ? {
        transcriptText: run.call.transcriptText,
        segments: (Array.isArray(run.call.segments)
          ? run.call.segments
          : []) as unknown as CallContext["segments"],
      }
    : null;

  const accumulated: AgentRunState = {};

  try {
    accumulated.research = await runStep<ResearchOutput>(orgId, runId, "RESEARCH", () =>
      researchNode({
        leadName: run.lead.name,
        companyName: run.lead.companyName,
        companyWebsite: run.lead.companyWebsite,
      }),
    );

    if (callContext?.transcriptText) {
      accumulated.analysis = await runStep<AnalysisOutput>(orgId, runId, "ANALYSIS", () =>
        analysisNode({
          leadName: run.lead.name,
          companyName: run.lead.companyName,
          transcript: callContext.transcriptText!,
          segments: callContext.segments,
        }),
      );
    } else {
      await markStepSkipped(orgId, runId, "ANALYSIS");
    }

    accumulated.strategy = await runStep<StrategyOutput>(orgId, runId, "STRATEGY", () =>
      strategyNode({
        leadName: run.lead.name,
        companyName: run.lead.companyName,
        research: accumulated.research!,
        analysis: accumulated.analysis ?? null,
      }),
    );

    accumulated.writer = await runStep<WriterOutput>(orgId, runId, "WRITER", () =>
      writerNode({
        leadName: run.lead.name,
        companyName: run.lead.companyName,
        research: accumulated.research!,
        analysis: accumulated.analysis ?? null,
        strategy: accumulated.strategy!,
        segments: callContext?.segments,
      }),
    );

    await db.agentRun.update({
      where: { id: runId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        state: accumulated as never,
      },
    });

    await writeAudit({
      orgId,
      actorUserId: asUserId(run.createdByUserId),
      action: "run.completed",
      targetType: "run",
      targetId: asRunId(runId),
      metadata: { leadId: run.leadId, callId: run.callId },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.agentRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        state: accumulated as never,
      },
    });
    await writeAudit({
      orgId,
      actorUserId: asUserId(run.createdByUserId),
      action: "run.failed",
      targetType: "run",
      targetId: asRunId(runId),
      metadata: { error: message },
    });
    throw err;
  }
}

async function runStep<T>(
  orgId: OrgId,
  runId: string,
  node: NodeName,
  fn: () => Promise<T>,
): Promise<T> {
  const db = getDb(orgId);
  await db.agentRunStep.upsert({
    where: { runId_node: { runId, node } },
    create: {
      orgId,
      runId,
      node,
      status: "RUNNING",
      startedAt: new Date(),
    },
    update: {
      status: "RUNNING",
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      output: undefined as never,
    },
  });

  try {
    const output = await fn();
    await db.agentRunStep.update({
      where: { runId_node: { runId, node } },
      data: {
        status: "COMPLETED",
        output: output as never,
        completedAt: new Date(),
      },
    });
    return output;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.agentRunStep.update({
      where: { runId_node: { runId, node } },
      data: {
        status: "FAILED",
        errorMessage: message,
        completedAt: new Date(),
      },
    });
    throw err;
  }
}

async function markStepSkipped(orgId: OrgId, runId: string, node: NodeName): Promise<void> {
  const db = getDb(orgId);
  await db.agentRunStep.upsert({
    where: { runId_node: { runId, node } },
    create: {
      orgId,
      runId,
      node,
      status: "SKIPPED",
      startedAt: new Date(),
      completedAt: new Date(),
    },
    update: { status: "SKIPPED", completedAt: new Date() },
  });
}

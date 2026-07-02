import { writeAudit } from "@/lib/audit/log";
import { getPrisma } from "@/lib/db/client";
import { asOrgId, asRunId, asUserId, type OrgId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";
import { publishEvent } from "@/lib/webhooks/publish";

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

    await db.emailDraft.upsert({
      where: { runId },
      create: {
        orgId,
        runId,
        subject: accumulated.writer.subject,
        body: accumulated.writer.body,
        citations: accumulated.writer.citations as never,
        status: "DRAFT",
      },
      update: {
        subject: accumulated.writer.subject,
        body: accumulated.writer.body,
        citations: accumulated.writer.citations as never,
        status: "DRAFT",
      },
    });

    await db.agentRun.update({
      where: { id: runId },
      data: {
        status: "AWAITING_APPROVAL",
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

    await publishEvent(orgId, "run.completed", {
      runId,
      leadId: run.leadId,
      callId: run.callId,
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
        errorCode: `${node.toLowerCase()}.error`,
        completedAt: new Date(),
      },
    });
    throw err;
  }
}

export async function regenerateWriter(runId: string, feedback: string): Promise<void> {
  const prisma = getPrisma();
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      orgId: true,
      state: true,
      lead: { select: { name: true, companyName: true } },
      call: { select: { segments: true } },
    },
  });
  if (!run) throw new Error(`AgentRun ${runId} not found`);

  const orgId = asOrgId(run.orgId);
  const db = getDb(orgId);

  const state = (run.state ?? {}) as AgentRunState;
  if (!state.research || !state.strategy) {
    throw new Error("Cannot regenerate: prior run is missing research or strategy state");
  }

  const segments = run.call
    ? ((Array.isArray(run.call.segments)
        ? run.call.segments
        : []) as unknown as CallContext["segments"])
    : undefined;

  await db.agentRun.update({
    where: { id: runId },
    data: { status: "RUNNING" },
  });

  try {
    const writer = await runStep<WriterOutput>(orgId, runId, "WRITER", () =>
      writerNode({
        leadName: run.lead.name,
        companyName: run.lead.companyName,
        research: state.research!,
        analysis: state.analysis ?? null,
        strategy: state.strategy!,
        segments,
        feedback,
      }),
    );

    await db.emailDraft.update({
      where: { runId },
      data: {
        subject: writer.subject,
        body: writer.body,
        citations: writer.citations as never,
        status: "DRAFT",
      },
    });

    await db.agentRun.update({
      where: { id: runId },
      data: {
        status: "AWAITING_APPROVAL",
        completedAt: new Date(),
        state: { ...state, writer } as never,
      },
    });
  } catch (err) {
    await db.agentRun.update({
      where: { id: runId },
      data: { status: "FAILED" },
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

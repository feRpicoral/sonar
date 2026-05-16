import { after, type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runAgent } from "@/lib/agents/runner";
import { writeAudit } from "@/lib/audit/log";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";
import { asRunId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

// Vercel Hobby caps at 60s. Most agent runs finish in 15-25s. Bump to 300
// here and in the Vercel project settings if you upgrade to Pro.
export const maxDuration = 60;

const bodySchema = z.object({
  leadId: z.string().uuid(),
  callId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireSessionOrOnboard();

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = getDb(session.orgId);

  const lead = await db.lead.findUnique({
    where: { id: parsed.data.leadId, deletedAt: null },
    select: { id: true },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (parsed.data.callId) {
    const call = await db.call.findUnique({
      where: { id: parsed.data.callId },
      select: { id: true, leadId: true, transcriptText: true, deletedAt: true },
    });
    if (!call || call.leadId !== lead.id || call.deletedAt) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }
    if (!call.transcriptText) {
      return NextResponse.json({ error: "Call has no transcript yet" }, { status: 400 });
    }
  }

  const run = await getPrisma().agentRun.create({
    data: {
      orgId: session.orgId,
      leadId: lead.id,
      callId: parsed.data.callId ?? null,
      status: "PENDING",
      createdByUserId: session.userId,
    },
    select: { id: true },
  });

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "run.started",
    targetType: "run",
    targetId: asRunId(run.id),
    metadata: { leadId: lead.id, callId: parsed.data.callId ?? null },
  });

  after(async () => {
    try {
      await runAgent(run.id);
    } catch (err) {
      // Final FAILED state is already written by runAgent's catch.
      console.error(`AgentRun ${run.id} failed:`, err);
    }
  });

  return NextResponse.json({ runId: run.id });
}

import { after, type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runAgent } from "@/lib/agents/runner";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { writeAudit } from "@/lib/audit/log";
import { createAgentRunWithinLimit, RunLimitReachedError } from "@/lib/billing/usage";
import { getPrisma } from "@/lib/db/client";
import { asRunId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

// Match the UI route; Vercel Hobby caps at 60s.
export const maxDuration = 60;

const startSchema = z.object({
  leadId: z.string().uuid(),
  callId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await verifyApiKey(req, "runs:write");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = getDb(auth.auth.orgId);

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

  const prisma = getPrisma();
  const admin = await prisma.membership.findFirst({
    where: { orgId: auth.auth.orgId, role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });
  if (!admin) {
    return NextResponse.json({ error: "No admin available" }, { status: 500 });
  }

  let run: { id: string };
  try {
    run = await createAgentRunWithinLimit({
      orgId: auth.auth.orgId,
      leadId: lead.id,
      callId: parsed.data.callId ?? null,
      createdByUserId: admin.userId,
    });
  } catch (err) {
    if (err instanceof RunLimitReachedError) {
      return NextResponse.json(
        { error: `Free plan monthly run limit (${err.limit}) reached. Upgrade to Pro.` },
        { status: 402 },
      );
    }
    throw err;
  }

  await writeAudit({
    orgId: auth.auth.orgId,
    actorUserId: null,
    action: "run.started",
    targetType: "run",
    targetId: asRunId(run.id),
    metadata: { source: "api", apiKeyId: auth.auth.apiKeyId, leadId: lead.id },
  });

  after(async () => {
    try {
      await runAgent(run.id);
    } catch (err) {
      console.error(`AgentRun ${run.id} (api) failed:`, err);
    }
  });

  return NextResponse.json({ data: { id: run.id, status: "PENDING" } }, { status: 202 });
}

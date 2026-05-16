import { type NextRequest, NextResponse } from "next/server";

import { verifyApiKey } from "@/lib/api-keys/verify";
import { getDb } from "@/lib/db/with-org";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifyApiKey(req, "runs:read");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const db = getDb(auth.auth.orgId);

  const run = await db.agentRun.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      leadId: true,
      callId: true,
      startedAt: true,
      completedAt: true,
      traceUrl: true,
      steps: {
        orderBy: { createdAt: "asc" },
        select: {
          node: true,
          status: true,
          startedAt: true,
          completedAt: true,
          output: true,
        },
      },
      emailDraft: { select: { id: true, status: true, subject: true } },
    },
  });

  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  return NextResponse.json({ data: run });
}

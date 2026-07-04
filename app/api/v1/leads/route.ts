import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyApiKey } from "@/lib/api-keys/verify";
import { writeAudit } from "@/lib/audit/log";
import { getPrisma } from "@/lib/db/client";
import { asLeadId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";
import { publishEvent } from "@/lib/webhooks/publish";

const createSchema = z.object({
  name: z.string().min(1, "Name required").max(120),
  email: z.string().email().optional(),
  companyName: z.string().max(120).optional(),
  companyWebsite: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "URL must start with http:// or https://")
    .optional(),
  status: z.enum(["DISCOVERY", "QUALIFIED", "DEMO", "PROPOSAL", "CLOSED"]).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await verifyApiKey(req, "leads:read");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 100);

  const db = getDb(auth.auth.orgId);
  const leads = await db.lead.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      companyWebsite: true,
      status: true,
      assignedToUserId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ data: leads });
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiKey(req, "leads:write");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // API-created leads need a creator. We attribute to the first admin in the
  // workspace - keeps audit trail intact even when the caller is a service.
  const prisma = getPrisma();
  const admin = await prisma.membership.findFirst({
    where: { orgId: auth.auth.orgId, role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });
  if (!admin) {
    return NextResponse.json({ error: "No admin available to attribute lead" }, { status: 500 });
  }

  const db = getDb(auth.auth.orgId);
  const lead = await db.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        orgId: auth.auth.orgId,
        name: parsed.data.name,
        email: parsed.data.email ?? null,
        companyName: parsed.data.companyName ?? null,
        companyWebsite: parsed.data.companyWebsite ?? null,
        status: parsed.data.status ?? "DISCOVERY",
        createdByUserId: admin.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        status: true,
        createdAt: true,
      },
    });

    await writeAudit(
      {
        orgId: auth.auth.orgId,
        actorUserId: null,
        action: "lead.created",
        targetType: "lead",
        targetId: asLeadId(created.id),
        metadata: { source: "api", apiKeyId: auth.auth.apiKeyId, name: created.name },
      },
      tx,
    );

    return created;
  });

  await publishEvent(auth.auth.orgId, "lead.created", {
    leadId: lead.id,
    name: lead.name,
    status: lead.status,
    source: "api",
  });

  return NextResponse.json({ data: lead }, { status: 201 });
}

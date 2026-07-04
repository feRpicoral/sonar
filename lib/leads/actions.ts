"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAudit } from "@/lib/audit/log";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";
import { asLeadId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";
import { canMoveLeadStage, CLOSED_GUARD_MESSAGE } from "@/lib/status";
import { publishEvent } from "@/lib/webhooks/publish";

const LEAD_STATUSES = ["DISCOVERY", "QUALIFIED", "DEMO", "PROPOSAL", "CLOSED"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

// Reject non-http(s) schemes (javascript:, data:, ...). companyWebsite is
// rendered as a raw <a href> on the lead page, so an unrestricted URL is a
// stored-XSS vector.
const companyWebsiteSchema = z.union([
  z
    .string()
    .url("Invalid URL")
    .refine((u) => /^https?:\/\//i.test(u), "URL must start with http:// or https://"),
  z.literal(""),
]);

const createSchema = z.object({
  name: z.string().min(1, "Name required").max(120),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  companyName: z.union([z.string().max(120), z.literal("")]).optional(),
  companyWebsite: companyWebsiteSchema.optional(),
  status: z.enum(LEAD_STATUSES).default("DISCOVERY"),
});

export type CreateLeadResult = { error?: string; id?: string };

export async function createLeadAction(
  _prev: CreateLeadResult,
  formData: FormData,
): Promise<CreateLeadResult> {
  const session = await requireSessionOrOnboard();
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    companyName: formData.get("companyName") || undefined,
    companyWebsite: formData.get("companyWebsite") || undefined,
    status: (formData.get("status") as string | null) ?? "DISCOVERY",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const db = getDb(session.orgId);
  const lead = await db.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        orgId: session.orgId,
        name: parsed.data.name,
        email: parsed.data.email || null,
        companyName: parsed.data.companyName || null,
        companyWebsite: parsed.data.companyWebsite || null,
        status: parsed.data.status,
        assignedToUserId: session.userId,
        createdByUserId: session.userId,
      },
    });

    await writeAudit(
      {
        orgId: session.orgId,
        actorUserId: session.userId,
        action: "lead.created",
        targetType: "lead",
        targetId: asLeadId(created.id),
        metadata: { name: created.name, status: created.status },
      },
      tx,
    );

    return created;
  });

  await publishEvent(session.orgId, "lead.created", {
    leadId: lead.id,
    name: lead.name,
    companyName: lead.companyName,
    status: lead.status,
  });

  revalidatePath("/leads");
  return { id: lead.id };
}

export async function updateLeadStatusAction(
  leadId: string,
  status: LeadStatus,
): Promise<{ error?: string }> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  if (!isLeadStatus(status)) return { error: "Invalid status" };

  const existing = await db.lead.findUnique({
    where: { id: leadId },
    select: { status: true },
  });
  if (!existing) return { error: "Lead not found" };
  if (existing.status === status) return {};
  if (!canMoveLeadStage(existing.status, status)) {
    return { error: CLOSED_GUARD_MESSAGE };
  }

  await db.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: { status },
    });

    await writeAudit(
      {
        orgId: session.orgId,
        actorUserId: session.userId,
        action: "lead.updated",
        targetType: "lead",
        targetId: asLeadId(leadId),
        metadata: { from: existing.status, to: status },
      },
      tx,
    );
  });

  await publishEvent(session.orgId, "lead.updated", {
    leadId,
    from: existing.status,
    to: status,
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return {};
}

const emailSchema = z.union([z.string().email("Invalid email"), z.literal("")]);

export async function updateLeadEmailAction(
  leadId: string,
  email: string,
): Promise<{ error?: string }> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const parsed = emailSchema.safeParse(email.trim());
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid email" };

  const existing = await db.lead.findUnique({
    where: { id: leadId },
    select: { email: true },
  });
  if (!existing) return { error: "Lead not found" };

  const nextEmail = parsed.data || null;
  if (existing.email === nextEmail) return {};

  await db.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: { email: nextEmail },
    });

    await writeAudit(
      {
        orgId: session.orgId,
        actorUserId: session.userId,
        action: "lead.updated",
        targetType: "lead",
        targetId: asLeadId(leadId),
        metadata: { field: "email" },
      },
      tx,
    );
  });

  revalidatePath(`/leads/${leadId}`);
  return {};
}

const updateLeadSchema = z.object({
  name: z.string().min(1, "Name required").max(120),
  companyName: z.union([z.string().max(120), z.literal("")]).optional(),
  companyWebsite: companyWebsiteSchema.optional(),
});

export async function updateLeadAction(
  leadId: string,
  input: { name: string; companyName?: string; companyWebsite?: string },
): Promise<{ error?: string }> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const parsed = updateLeadSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const existing = await db.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!existing) return { error: "Lead not found" };

  await db.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: {
        name: parsed.data.name,
        companyName: parsed.data.companyName || null,
        companyWebsite: parsed.data.companyWebsite || null,
      },
    });

    await writeAudit(
      {
        orgId: session.orgId,
        actorUserId: session.userId,
        action: "lead.updated",
        targetType: "lead",
        targetId: asLeadId(leadId),
        metadata: { fields: ["name", "companyName", "companyWebsite"] },
      },
      tx,
    );
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return {};
}

export async function assignLeadAction(
  leadId: string,
  userId: string | null,
): Promise<{ error?: string }> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  if (userId) {
    const prisma = getPrisma();
    const m = await prisma.membership.findUnique({
      where: { orgId_userId: { orgId: session.orgId, userId } },
      select: { id: true },
    });
    if (!m) return { error: "Not a member of this workspace" };
  }

  await db.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: { assignedToUserId: userId },
    });

    await writeAudit(
      {
        orgId: session.orgId,
        actorUserId: session.userId,
        action: "lead.assigned",
        targetType: "lead",
        targetId: asLeadId(leadId),
        metadata: { assignedToUserId: userId },
      },
      tx,
    );
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return {};
}

export async function softDeleteLeadAction(leadId: string): Promise<{ error?: string }> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { assignedToUserId: true, createdByUserId: true },
  });
  if (!lead) return { error: "Lead not found" };
  const isOwner =
    lead.assignedToUserId === session.userId || lead.createdByUserId === session.userId;
  if (session.role !== "ADMIN" && !isOwner) {
    return { error: "Only admins or the assignee can delete this lead" };
  }

  await db.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: { deletedAt: new Date(), deletedByUserId: session.userId },
    });

    await writeAudit(
      {
        orgId: session.orgId,
        actorUserId: session.userId,
        action: "lead.deleted",
        targetType: "lead",
        targetId: asLeadId(leadId),
      },
      tx,
    );
  });

  revalidatePath("/leads");
  return {};
}

export type BulkStatusResult = { error?: string; movedCount?: number; skippedCount?: number };

export async function updateLeadStatusBulkAction(
  leadIds: string[],
  status: LeadStatus,
): Promise<BulkStatusResult> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);
  if (leadIds.length === 0) return {};
  if (!isLeadStatus(status)) return { error: "Invalid status" };

  const leads = await db.lead.findMany({
    where: { id: { in: leadIds }, deletedAt: null },
    select: { id: true, status: true },
  });
  const movable = leads.filter((l) => canMoveLeadStage(l.status, status));
  if (movable.length === 0) return { error: CLOSED_GUARD_MESSAGE };

  const movableIds = movable.map((l) => l.id);
  await db.$transaction(async (tx) => {
    await tx.lead.updateMany({ where: { id: { in: movableIds } }, data: { status } });

    await writeAudit(
      {
        orgId: session.orgId,
        actorUserId: session.userId,
        action: "lead.updated",
        targetType: "lead",
        metadata: { bulk: true, count: movableIds.length, to: status },
      },
      tx,
    );
  });
  await Promise.all(
    movable.map((l) =>
      publishEvent(session.orgId, "lead.updated", { leadId: l.id, from: l.status, to: status }),
    ),
  );

  revalidatePath("/leads");
  return { movedCount: movableIds.length, skippedCount: leadIds.length - movableIds.length };
}

export async function softDeleteLeadsBulkAction(
  leadIds: string[],
): Promise<{ error?: string; deletedCount?: number }> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);
  if (leadIds.length === 0) return {};

  const ownership =
    session.role === "ADMIN"
      ? {}
      : { OR: [{ assignedToUserId: session.userId }, { createdByUserId: session.userId }] };

  const result = await db.$transaction(async (tx) => {
    const deleted = await tx.lead.updateMany({
      where: { id: { in: leadIds }, deletedAt: null, ...ownership },
      data: { deletedAt: new Date(), deletedByUserId: session.userId },
    });

    await writeAudit(
      {
        orgId: session.orgId,
        actorUserId: session.userId,
        action: "lead.deleted",
        targetType: "lead",
        metadata: { bulk: true, count: deleted.count },
      },
      tx,
    );

    return deleted;
  });

  revalidatePath("/leads");
  return { deletedCount: result.count };
}

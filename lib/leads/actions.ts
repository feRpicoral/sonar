"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAudit } from "@/lib/audit/log";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";
import { asLeadId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";
import { publishEvent } from "@/lib/webhooks/publish";

const LEAD_STATUSES = ["DISCOVERY", "QUALIFIED", "DEMO", "PROPOSAL", "CLOSED"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

const createSchema = z.object({
  name: z.string().min(1, "Name required").max(120),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  companyName: z.union([z.string().max(120), z.literal("")]).optional(),
  companyWebsite: z.union([z.string().url("Invalid URL"), z.literal("")]).optional(),
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
  const lead = await db.lead.create({
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

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "lead.created",
    targetType: "lead",
    targetId: asLeadId(lead.id),
    metadata: { name: lead.name, status: lead.status },
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

  const existing = await db.lead.findUnique({
    where: { id: leadId },
    select: { status: true },
  });
  if (!existing) return { error: "Lead not found" };
  if (existing.status === status) return {};

  await db.lead.update({
    where: { id: leadId },
    data: { status },
  });

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "lead.updated",
    targetType: "lead",
    targetId: asLeadId(leadId),
    metadata: { from: existing.status, to: status },
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

  await db.lead.update({
    where: { id: leadId },
    data: { email: nextEmail },
  });

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "lead.updated",
    targetType: "lead",
    targetId: asLeadId(leadId),
    metadata: { field: "email" },
  });

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

  await db.lead.update({
    where: { id: leadId },
    data: { assignedToUserId: userId },
  });

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "lead.assigned",
    targetType: "lead",
    targetId: asLeadId(leadId),
    metadata: { assignedToUserId: userId },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return {};
}

export async function softDeleteLeadAction(leadId: string): Promise<{ error?: string }> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  // Only admin or owner can delete.
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

  await db.lead.update({
    where: { id: leadId },
    data: { deletedAt: new Date() },
  });

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "lead.deleted",
    targetType: "lead",
    targetId: asLeadId(leadId),
  });

  revalidatePath("/leads");
  return {};
}

"use server";

import { revalidatePath } from "next/cache";

import { writeAudit } from "@/lib/audit/log";
import { requireAdmin, requireSessionOrOnboard } from "@/lib/auth/session";
import { asLeadId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

export async function restoreLeadAction(leadId: string): Promise<{ error?: string; ok?: true }> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { id: true, deletedAt: true, name: true },
  });
  if (!lead) return { error: "Lead not found" };
  if (!lead.deletedAt) return { error: "Lead is not in trash" };

  await db.lead.update({
    where: { id: leadId },
    data: { deletedAt: null },
  });

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "lead.restored",
    targetType: "lead",
    targetId: asLeadId(leadId),
    metadata: { name: lead.name },
  });

  revalidatePath("/trash");
  revalidatePath("/leads");
  return { ok: true };
}

export async function permanentlyDeleteLeadAction(
  leadId: string,
): Promise<{ error?: string; ok?: true }> {
  const session = await requireAdmin();
  const db = getDb(session.orgId);

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { id: true, deletedAt: true, name: true },
  });
  if (!lead) return { error: "Lead not found" };
  if (!lead.deletedAt) return { error: "Only trashed leads can be permanently deleted" };

  await db.lead.delete({ where: { id: leadId } });

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "lead.deleted",
    targetType: "lead",
    targetId: asLeadId(leadId),
    metadata: { name: lead.name, permanent: true },
  });

  revalidatePath("/trash");
  return { ok: true };
}

export async function emptyTrashAction(): Promise<{ error?: string; deletedCount?: number }> {
  const session = await requireAdmin();
  const db = getDb(session.orgId);

  const result = await db.lead.deleteMany({ where: { deletedAt: { not: null } } });

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "lead.deleted",
    targetType: "lead",
    metadata: { emptyTrash: true, count: result.count },
  });

  revalidatePath("/trash");
  return { deletedCount: result.count };
}

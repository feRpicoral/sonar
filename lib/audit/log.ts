import { headers } from "next/headers";

import { getPrisma } from "@/lib/db/client";
import type { OrgId, UserId } from "@/lib/db/types";

/**
 * Canonical audit action vocabulary. New mutating endpoints must register here
 * - keeps the activity UI filter and event publisher in lockstep.
 */
export type AuditAction =
  | "org.created"
  | "org.updated"
  | "org.deleted"
  | "member.invited"
  | "member.joined"
  | "member.removed"
  | "member.role_changed"
  | "lead.created"
  | "lead.updated"
  | "lead.deleted"
  | "lead.restored"
  | "lead.assigned"
  | "call.uploaded"
  | "call.deleted"
  | "call.cancelled"
  | "run.started"
  | "run.completed"
  | "run.failed"
  | "email.approved"
  | "email.regenerated"
  | "email.sent"
  | "api_key.created"
  | "api_key.revoked"
  | "webhook.created"
  | "webhook.updated"
  | "webhook.deleted"
  | "webhook.secret_rotated"
  | "subscription.changed";

export interface AuditEntry {
  orgId: OrgId;
  actorUserId?: UserId | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  let ip: string | undefined;
  let userAgent: string | undefined;
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    ip = forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined;
    userAgent = h.get("user-agent") ?? undefined;
  } catch {
    // Called outside of a request context (Inngest job, cron, etc.).
  }

  await getPrisma().auditLog.create({
    data: {
      orgId: entry.orgId,
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      metadata: (entry.metadata ?? {}) as never,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });
}

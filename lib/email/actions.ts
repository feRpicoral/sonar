"use server";

import { revalidatePath } from "next/cache";

import { regenerateWriter } from "@/lib/agents/runner";
import { writeAudit } from "@/lib/audit/log";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { asEmailDraftId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";
import { getFromAddress, sendEmail } from "@/lib/email/resend";
import { publishEvent } from "@/lib/webhooks/publish";

export type ActionResult<T extends object = object> =
  | ({ error: string } & Partial<T>)
  | ({ error?: undefined } & T);

export async function approveAndSendEmailAction(
  draftId: string,
): Promise<ActionResult<{ ok: true }>> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const draft = await db.emailDraft.findUnique({
    where: { id: draftId },
    select: {
      id: true,
      subject: true,
      body: true,
      status: true,
      runId: true,
      run: {
        select: {
          lead: { select: { id: true, email: true } },
        },
      },
    },
  });
  if (!draft) return { error: "Draft not found" };
  if (draft.status === "SENT") return { error: "Already sent" };
  if (draft.status === "APPROVED") return { error: "Send already in progress" };

  const recipient = draft.run.lead.email;
  if (!recipient) {
    return { error: "Lead has no email on file - add one before sending." };
  }

  // Atomic claim: only the caller that flips DRAFT/FAILED -> APPROVED proceeds
  // to Resend. A second concurrent click sees count = 0 and bails before the
  // network call, so we can't double-send the same draft.
  const claim = await db.emailDraft.updateMany({
    where: { id: draftId, status: { in: ["DRAFT", "FAILED"] } },
    data: {
      status: "APPROVED",
      failureReason: null,
      approvedAt: new Date(),
      approvedByUserId: session.userId,
    },
  });
  if (claim.count === 0) {
    return { error: "Send already in progress" };
  }

  if (!process.env.RESEND_API_KEY) {
    await db.emailDraft.update({
      where: { id: draftId },
      data: { status: "SENT" },
    });
    await db.agentRun.update({
      where: { id: draft.runId },
      data: { status: "COMPLETED" },
    });
    await writeAudit({
      orgId: session.orgId,
      actorUserId: session.userId,
      action: "email.sent",
      targetType: "email_draft",
      targetId: asEmailDraftId(draft.id),
      metadata: { to: recipient, mode: "dev-skip-resend" },
    });
    revalidatePath(`/emails/${draftId}/approve`);
    return { ok: true };
  }

  try {
    const result = await sendEmail({
      to: recipient,
      subject: draft.subject,
      text: draft.body,
      replyTo: session.email,
      idempotencyKey: `draft:${draft.id}`,
    });
    await db.emailDraft.update({
      where: { id: draftId },
      data: { status: "SENT" },
    });
    await db.emailDelivery.create({
      data: {
        orgId: session.orgId,
        draftId: draft.id,
        resendMessageId: result.messageId,
        recipientEmail: recipient,
        status: "SENT",
        sentAt: new Date(),
      },
    });
    await db.agentRun.update({
      where: { id: draft.runId },
      data: { status: "COMPLETED" },
    });
    await writeAudit({
      orgId: session.orgId,
      actorUserId: session.userId,
      action: "email.sent",
      targetType: "email_draft",
      targetId: asEmailDraftId(draft.id),
      metadata: { to: recipient, from: getFromAddress(), resendMessageId: result.messageId },
    });

    await publishEvent(session.orgId, "email.sent", {
      draftId: draft.id,
      to: recipient,
      subject: draft.subject,
      resendMessageId: result.messageId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.emailDraft.update({
      where: { id: draftId },
      data: { status: "FAILED", failureReason: message },
    });
    return { error: message };
  }

  revalidatePath(`/emails/${draftId}/approve`);
  return { ok: true };
}

export async function updateEmailDraftAction(
  draftId: string,
  subject: string,
  body: string,
): Promise<ActionResult<{ ok: true }>> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const draft = await db.emailDraft.findUnique({
    where: { id: draftId },
    select: { id: true, status: true },
  });
  if (!draft) return { error: "Draft not found" };
  if (draft.status === "SENT") return { error: "Already sent" };

  await db.emailDraft.update({
    where: { id: draftId },
    data: {
      subject: subject.trim(),
      body: body.trim(),
      // User-edited body invalidates auto-generated citations - clear them so
      // we don't show phantom highlights pointing at wrong segments.
      citations: [] as never,
    },
  });

  revalidatePath(`/emails/${draftId}/approve`);
  return { ok: true };
}

export async function regenerateEmailAction(
  draftId: string,
  feedback: string,
): Promise<ActionResult<{ ok: true }>> {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const draft = await db.emailDraft.findUnique({
    where: { id: draftId },
    select: { id: true, status: true, runId: true },
  });
  if (!draft) return { error: "Draft not found" };
  if (draft.status === "SENT") return { error: "Already sent" };

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "email.regenerated",
    targetType: "email_draft",
    targetId: asEmailDraftId(draft.id),
    metadata: { feedback: feedback.slice(0, 500) },
  });

  // Re-run only the writer node against the existing run state, incorporating
  // the reviewer feedback. Research / analysis / strategy stay frozen.
  try {
    await regenerateWriter(draft.runId, feedback);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }

  revalidatePath(`/emails/${draftId}/approve`);
  return { ok: true };
}

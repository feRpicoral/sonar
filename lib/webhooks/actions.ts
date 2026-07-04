"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAudit } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/session";
import { asWebhookId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

import { deliverWebhook } from "./deliver";
import { generateWebhookSecret } from "./hmac";
import { WEBHOOK_EVENTS, type WebhookEventType } from "./publish";
import { assertSafeWebhookUrl, UnsafeWebhookUrlError } from "./safe-url";
import { decryptWebhookSecret, encryptWebhookSecret } from "./secret-crypto";

const createSchema = z.object({
  url: z.string().url("Invalid URL"),
  description: z.string().max(120).optional(),
  events: z.array(z.string()).min(1, "Subscribe to at least one event"),
});

export type CreateWebhookResult = { error: string } | { id: string; secret: string };

export async function createWebhookAction(input: {
  url: string;
  description?: string;
  events: string[];
}): Promise<CreateWebhookResult> {
  const session = await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const allowed = new Set<string>(WEBHOOK_EVENTS);
  const bad = parsed.data.events.filter((e) => !allowed.has(e));
  if (bad.length > 0) return { error: `Unknown events: ${bad.join(", ")}` };

  try {
    await assertSafeWebhookUrl(parsed.data.url);
  } catch (err) {
    return {
      error:
        err instanceof UnsafeWebhookUrlError ? err.message : "Webhook URL failed safety validation",
    };
  }

  const events = [...new Set(parsed.data.events)] as WebhookEventType[];
  const secret = generateWebhookSecret();

  const db = getDb(session.orgId);
  const webhook = await db.$transaction(async (tx) => {
    const created = await tx.webhook.create({
      data: {
        orgId: session.orgId,
        url: parsed.data.url,
        description: parsed.data.description ?? null,
        events,
        secret: encryptWebhookSecret(secret),
        createdByUserId: session.userId,
      },
      select: { id: true },
    });

    await writeAudit(
      {
        orgId: session.orgId,
        actorUserId: session.userId,
        action: "webhook.created",
        targetType: "webhook",
        targetId: asWebhookId(created.id),
        metadata: { url: parsed.data.url, events },
      },
      tx,
    );

    return created;
  });

  revalidatePath("/settings/webhooks");
  return { id: webhook.id, secret };
}

export async function setWebhookActiveAction(
  webhookId: string,
  active: boolean,
): Promise<{ error?: string; ok?: true }> {
  const session = await requireAdmin();
  const db = getDb(session.orgId);

  await db.$transaction(async (tx) => {
    const updated = await tx.webhook.update({
      where: { id: webhookId },
      data: { active },
      select: { id: true },
    });

    await writeAudit(
      {
        orgId: session.orgId,
        actorUserId: session.userId,
        action: "webhook.updated",
        targetType: "webhook",
        targetId: asWebhookId(updated.id),
        metadata: { active },
      },
      tx,
    );
  });

  revalidatePath("/settings/webhooks");
  return { ok: true };
}

export async function deleteWebhookAction(
  webhookId: string,
): Promise<{ error?: string; ok?: true }> {
  const session = await requireAdmin();
  const db = getDb(session.orgId);

  const deleted = await db.$transaction(async (tx) => {
    const existing = await tx.webhook.findUnique({
      where: { id: webhookId },
      select: { url: true },
    });
    if (!existing) return false;

    await tx.webhook.delete({ where: { id: webhookId } });

    await writeAudit(
      {
        orgId: session.orgId,
        actorUserId: session.userId,
        action: "webhook.deleted",
        targetType: "webhook",
        targetId: asWebhookId(webhookId),
        metadata: { url: existing.url },
      },
      tx,
    );

    return true;
  });
  if (!deleted) return { error: "Webhook not found" };

  revalidatePath("/settings/webhooks");
  return { ok: true };
}

export async function rotateWebhookSecretAction(
  webhookId: string,
): Promise<{ error?: string; secret?: string }> {
  const session = await requireAdmin();
  const db = getDb(session.orgId);

  const newSecret = generateWebhookSecret();
  await db.$transaction(async (tx) => {
    await tx.webhook.update({
      where: { id: webhookId },
      data: { secret: encryptWebhookSecret(newSecret) },
    });

    await writeAudit(
      {
        orgId: session.orgId,
        actorUserId: session.userId,
        action: "webhook.secret_rotated",
        targetType: "webhook",
        targetId: asWebhookId(webhookId),
        metadata: {},
      },
      tx,
    );
  });

  revalidatePath("/settings/webhooks");
  return { secret: newSecret };
}

export async function replayDeliveryAction(
  deliveryId: string,
): Promise<{ error?: string; ok?: true }> {
  const session = await requireAdmin();
  const db = getDb(session.orgId);

  const original = await db.webhookDelivery.findUnique({
    where: { id: deliveryId },
    select: {
      eventType: true,
      payload: true,
      webhook: { select: { id: true, url: true, secret: true, active: true } },
    },
  });
  if (!original) return { error: "Delivery not found" };
  if (!original.webhook.active) return { error: "Webhook is paused" };

  await deliverWebhook({
    orgId: session.orgId,
    webhookId: original.webhook.id,
    url: original.webhook.url,
    secret: decryptWebhookSecret(original.webhook.secret),
    eventType: original.eventType,
    payload: (original.payload as Record<string, unknown>) ?? {},
  });

  revalidatePath("/settings/webhooks");
  return { ok: true };
}

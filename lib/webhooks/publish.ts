import type { OrgId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

import { deliverWebhook } from "./deliver";

export const WEBHOOK_EVENTS = [
  "lead.created",
  "lead.updated",
  "run.completed",
  "email.approved",
  "email.sent",
  "email.delivered",
  "email.bounced",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

/**
 * Fan out an event to every active webhook subscription that matches.
 * Deliveries run in parallel; failures are recorded in WebhookDelivery but
 * don't propagate - the caller's mutation should not roll back if a webhook
 * subscriber is misconfigured.
 */
export async function publishEvent(
  orgId: OrgId,
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  const db = getDb(orgId);
  const subscribers = await db.webhook.findMany({
    where: { active: true, events: { has: eventType } },
    select: { id: true, url: true, secret: true },
  });
  if (subscribers.length === 0) return;

  await Promise.allSettled(
    subscribers.map((w) =>
      deliverWebhook({
        orgId,
        webhookId: w.id,
        url: w.url,
        secret: w.secret,
        eventType,
        payload,
      }),
    ),
  );
}

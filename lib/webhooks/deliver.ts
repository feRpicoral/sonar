import { randomUUID } from "crypto";

import type { OrgId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

import { SIGNATURE_HEADER, signWebhookPayload } from "./hmac";

const REQUEST_TIMEOUT_MS = 10_000;

export interface DeliveryInput {
  orgId: OrgId;
  webhookId: string;
  url: string;
  secret: string;
  eventType: string;
  payload: Record<string, unknown>;
}

/**
 * Deliver a single webhook event synchronously. Records a WebhookDelivery row
 * with response status/body and either DELIVERED or FAILED status. Retry queue
 * (Inngest backoff) ships in a follow-up - V1 fires and persists once.
 */
export async function deliverWebhook(input: DeliveryInput): Promise<{ delivered: boolean }> {
  const db = getDb(input.orgId);
  const eventId = randomUUID();
  const rawBody = JSON.stringify({
    id: eventId,
    type: input.eventType,
    orgId: input.orgId,
    deliveredAt: new Date().toISOString(),
    data: input.payload,
  });

  const signed = signWebhookPayload(rawBody, input.secret);

  const delivery = await db.webhookDelivery.create({
    data: {
      orgId: input.orgId,
      webhookId: input.webhookId,
      eventId,
      eventType: input.eventType,
      payload: input.payload as never,
      attempt: 1,
      status: "PENDING",
    },
    select: { id: true },
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(input.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Sonar-Webhooks/1.0",
        [SIGNATURE_HEADER]: signed.header,
      },
      body: rawBody,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const responseBody = await response
      .text()
      .then((s) => s.slice(0, 2048))
      .catch(() => null);

    const ok = response.status >= 200 && response.status < 300;
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: ok ? "DELIVERED" : "FAILED",
        responseStatus: response.status,
        responseBody,
        deliveredAt: ok ? new Date() : null,
      },
    });
    return { delivered: ok };
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : String(err);
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "FAILED",
        responseBody: message.slice(0, 2048),
      },
    });
    return { delivered: false };
  }
}

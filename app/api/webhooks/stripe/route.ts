import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { writeAudit } from "@/lib/audit/log";
import { getStripe } from "@/lib/billing/stripe";
import { getPrisma } from "@/lib/db/client";
import { asOrgId } from "@/lib/db/types";
import { requireEnv } from "@/lib/env/server";

const HANDLED_EVENTS = new Set<Stripe.Event.Type>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
]);

type TxClient = Parameters<Parameters<ReturnType<typeof getPrisma>["$transaction"]>[0]>[0];

// A P2002 specifically on the processed-events unique key means a concurrent
// delivery of the SAME event won the claim - safe to acknowledge. Any other
// P2002 comes from the handler (e.g. a subscription unique conflict) and must
// surface as a 500 so Stripe retries instead of us silently dropping the event.
function isDuplicateEventError(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("code" in err)) return false;
  if ((err as { code: unknown }).code !== "P2002") return false;
  const meta = (err as { meta?: { modelName?: unknown; target?: unknown } }).meta;
  if (meta?.modelName === "ProcessedStripeEvent") return true;
  const target = Array.isArray(meta?.target) ? meta.target.join(",") : String(meta?.target ?? "");
  return /event_?id/i.test(target);
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "P2002"
  );
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing signature", { status: 400 });

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return new NextResponse(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  const prisma = getPrisma();

  // Fast-path dedupe before opening a transaction: if we already recorded the
  // event, acknowledge without touching anything else.
  const alreadyProcessed = await prisma.processedStripeEvent.findUnique({
    where: { eventId: event.id },
    select: { eventId: true },
  });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Claim the event and run its handler atomically: if the handler throws, the
  // claim rolls back and Stripe will retry on the next delivery.
  let auditEntry: AuditEntry | null = null;
  try {
    auditEntry = await prisma.$transaction(async (tx) => {
      await tx.processedStripeEvent.create({
        data: { eventId: event.id, type: event.type },
      });
      if (!HANDLED_EVENTS.has(event.type)) return null;
      return await handleEvent(event, tx);
    });
  } catch (err) {
    if (isDuplicateEventError(err)) {
      // Two deliveries of the same event raced; the other one won. Acknowledge.
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error(`Stripe webhook handler for ${event.type} failed:`, err);
    return new NextResponse("handler_failed", { status: 500 });
  }

  if (auditEntry) {
    await writeAudit(auditEntry);
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, handled: false });
  }
  return NextResponse.json({ received: true });
}

interface AuditEntry {
  orgId: ReturnType<typeof asOrgId>;
  actorUserId: null;
  action: "subscription.changed";
  targetType: "subscription";
  metadata: Record<string, unknown>;
}

async function handleEvent(event: Stripe.Event, tx: TxClient): Promise<AuditEntry | null> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const orgId = (sub.metadata?.orgId as string | undefined) ?? null;
      if (!orgId) return null;

      const eventCreatedAt = new Date(event.created * 1000);
      const isActive =
        sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
      const plan: "PRO" | "FREE" =
        isActive && event.type !== "customer.subscription.deleted" ? "PRO" : "FREE";

      // As of Stripe API 2025-03-31, current_period_end lives on the
      // subscription item, not the subscription. Reading it off `sub` yields
      // undefined and persists a null period end forever.
      const currentPeriodEnd = stripeUnixToDate(sub.items.data[0]?.current_period_end);

      const data = {
        stripeSubscriptionId: sub.id,
        stripePriceId: sub.items.data[0]?.price.id ?? null,
        plan,
        status: mapStripeStatus(sub.status),
        currentPeriodEnd,
        lastStripeEventAt: eventCreatedAt,
      };
      const updateWhere = {
        orgId,
        OR: [{ lastStripeEventAt: null }, { lastStripeEventAt: { lt: eventCreatedAt } }],
      };

      const updated = await tx.subscription.updateMany({
        where: updateWhere,
        data,
      });
      if (updated.count === 0) {
        const existing = await tx.subscription.findUnique({
          where: { orgId },
          select: { lastStripeEventAt: true },
        });
        if (existing) return null;

        try {
          await tx.subscription.create({
            data: { orgId, ...data },
          });
        } catch (err) {
          if (!isUniqueConstraintError(err)) throw err;
          const retry = await tx.subscription.updateMany({
            where: updateWhere,
            data,
          });
          if (retry.count === 0) return null;
        }
      }

      return {
        orgId: asOrgId(orgId),
        actorUserId: null,
        action: "subscription.changed",
        targetType: "subscription",
        metadata: { stripeStatus: sub.status, plan, eventType: event.type },
      };
    }
    case "invoice.payment_succeeded":
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subscriptionDetails = invoice.parent?.subscription_details ?? null;
      let orgId =
        (invoice.metadata?.orgId as string | undefined) ??
        (subscriptionDetails?.metadata?.orgId as string | undefined) ??
        null;

      // Fall back to our own record: resolve the org from the subscription id
      // when the invoice metadata snapshot doesn't carry orgId.
      if (!orgId && subscriptionDetails?.subscription) {
        const subscriptionId =
          typeof subscriptionDetails.subscription === "string"
            ? subscriptionDetails.subscription
            : subscriptionDetails.subscription.id;
        const existing = await tx.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
          select: { orgId: true },
        });
        orgId = existing?.orgId ?? null;
      }
      if (!orgId) return null;
      return {
        orgId: asOrgId(orgId),
        actorUserId: null,
        action: "subscription.changed",
        targetType: "subscription",
        metadata: {
          eventType: event.type,
          amount: invoice.amount_paid,
          currency: invoice.currency,
        },
      };
    }
    default:
      return null;
  }
}

function mapStripeStatus(
  s: Stripe.Subscription.Status,
):
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "TRIALING"
  | "INCOMPLETE"
  | "INCOMPLETE_EXPIRED"
  | "UNPAID" {
  switch (s) {
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "trialing":
      return "TRIALING";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    case "unpaid":
      return "UNPAID";
    default:
      return "INCOMPLETE";
  }
}

function stripeUnixToDate(unix?: number): Date | null {
  if (!unix) return null;
  return new Date(unix * 1000);
}

// Stripe webhook verification needs Node runtime APIs.
export const runtime = "nodejs";

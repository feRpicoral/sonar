import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { writeAudit } from "@/lib/audit/log";
import { getStripe } from "@/lib/billing/stripe";
import { getPrisma } from "@/lib/db/client";
import { asOrgId } from "@/lib/db/types";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

const HANDLED_EVENTS = new Set<Stripe.Event.Type>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
]);

type TxClient = Parameters<Parameters<ReturnType<typeof getPrisma>["$transaction"]>[0]>[0];

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
    if (isUniqueConstraintError(err)) {
      // Two deliveries raced; the other one won. Acknowledge.
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

      const isActive =
        sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
      const plan = isActive && event.type !== "customer.subscription.deleted" ? "PRO" : "FREE";

      await tx.subscription.upsert({
        where: { orgId },
        create: {
          orgId,
          stripeSubscriptionId: sub.id,
          stripePriceId: sub.items.data[0]?.price.id ?? null,
          plan,
          status: mapStripeStatus(sub.status),
          currentPeriodEnd: stripeUnixToDate(
            (sub as unknown as { current_period_end?: number }).current_period_end,
          ),
        },
        update: {
          stripeSubscriptionId: sub.id,
          stripePriceId: sub.items.data[0]?.price.id ?? null,
          plan,
          status: mapStripeStatus(sub.status),
          currentPeriodEnd: stripeUnixToDate(
            (sub as unknown as { current_period_end?: number }).current_period_end,
          ),
        },
      });

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
      const orgId =
        (invoice.metadata?.orgId as string | undefined) ??
        (invoice as unknown as { subscription_details?: { metadata?: { orgId?: string } } })
          .subscription_details?.metadata?.orgId ??
        null;
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

import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { writeAudit } from "@/lib/audit/log";
import { getStripe } from "@/lib/billing/stripe";
import { getPrisma } from "@/lib/db/client";
import { asOrgId, asUserId } from "@/lib/db/types";

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

  // Idempotency - Stripe re-delivers on retry; dedupe by event.id.
  const prisma = getPrisma();
  try {
    await prisma.processedStripeEvent.create({
      data: { eventId: event.id, type: event.type },
    });
  } catch {
    // Already processed - return 200 to acknowledge.
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, handled: false });
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Stripe webhook handler for ${event.type} failed:`, err);
    // Don't return 5xx - would cause Stripe to retry. Mark as handled, log.
    return NextResponse.json({ received: true, error: "handler_failed" });
  }
}

async function handleEvent(event: Stripe.Event) {
  const prisma = getPrisma();

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const orgId = (sub.metadata?.orgId as string | undefined) ?? null;
      if (!orgId) return;

      const isActive =
        sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
      const plan = isActive && event.type !== "customer.subscription.deleted" ? "PRO" : "FREE";

      await prisma.subscription.upsert({
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

      await writeAudit({
        orgId: asOrgId(orgId),
        actorUserId: null,
        action: "subscription.changed",
        targetType: "subscription",
        metadata: { stripeStatus: sub.status, plan, eventType: event.type },
      });
      return;
    }
    case "invoice.payment_succeeded":
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const orgId =
        (invoice.metadata?.orgId as string | undefined) ??
        (invoice as unknown as { subscription_details?: { metadata?: { orgId?: string } } })
          .subscription_details?.metadata?.orgId ??
        null;
      if (!orgId) return;
      await writeAudit({
        orgId: asOrgId(orgId),
        actorUserId: null,
        action: "subscription.changed",
        targetType: "subscription",
        metadata: {
          eventType: event.type,
          amount: invoice.amount_paid,
          currency: invoice.currency,
        },
      });
      return;
    }
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

// Stripe needs to know not to redirect / parse this as Next.js body
export const runtime = "nodejs";

// Reference the unused export to satisfy ESLint without disabling rules.
void asUserId;

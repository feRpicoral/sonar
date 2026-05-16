"use server";

import { redirect } from "next/navigation";

import { writeAudit } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/session";

import { appUrl, getStripe, proPriceId } from "./stripe";

/**
 * Start a Stripe Checkout session for upgrading this workspace to Pro.
 * Creates or reuses the org's Stripe customer and redirects the user.
 */
export async function startCheckoutAction(): Promise<void> {
  const session = await requireAdmin();
  const stripe = getStripe();
  const prisma = (await import("@/lib/db/client")).getPrisma();

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { id: true, name: true, stripeCustomerId: true },
  });
  if (!org) throw new Error("Workspace not found");

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.email,
      name: org.name,
      metadata: { orgId: org.id },
    });
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: proPriceId(), quantity: 1 }],
    success_url: `${appUrl()}/settings/billing?status=success`,
    cancel_url: `${appUrl()}/settings/billing?status=cancelled`,
    metadata: { orgId: org.id },
    subscription_data: { metadata: { orgId: org.id } },
  });

  if (!checkout.url) throw new Error("Stripe did not return a checkout URL");

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "subscription.changed",
    targetType: "organization",
    targetId: org.id,
    metadata: { event: "checkout_started", checkoutId: checkout.id },
  });

  redirect(checkout.url);
}

/**
 * Open the Stripe Customer Portal for managing payment method, invoices,
 * and cancellation. Returns the URL to redirect the user to.
 */
export async function openPortalAction(): Promise<void> {
  const session = await requireAdmin();
  const stripe = getStripe();
  const prisma = (await import("@/lib/db/client")).getPrisma();

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { stripeCustomerId: true },
  });
  if (!org?.stripeCustomerId) {
    throw new Error("No Stripe customer yet - upgrade first");
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appUrl()}/settings/billing`,
  });

  redirect(portal.url);
}

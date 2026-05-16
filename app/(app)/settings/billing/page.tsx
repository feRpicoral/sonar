import { ArrowUpRight, CheckCircle2, CreditCard, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { openPortalAction, startCheckoutAction } from "@/lib/billing/actions";
import { getPrisma } from "@/lib/db/client";

const PLAN_FEATURES: Record<"FREE" | "PRO", string[]> = {
  FREE: [
    "10 agent runs per day",
    "Unlimited leads and calls",
    "Email follow-ups (test inbox)",
    "Audit log",
  ],
  PRO: [
    "Unlimited agent runs",
    "Custom domain for transactional email",
    "Outbound webhooks and scoped API keys",
    "Priority support",
  ],
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELED: "Cancelled",
  TRIALING: "Trial",
  INCOMPLETE: "Incomplete",
  INCOMPLETE_EXPIRED: "Expired",
  UNPAID: "Unpaid",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSessionOrOnboard();
  const { status: checkoutStatus } = await searchParams;
  const prisma = getPrisma();

  const subscription = await prisma.subscription.findUnique({
    where: { orgId: session.orgId },
    select: {
      plan: true,
      status: true,
      currentPeriodEnd: true,
      stripeSubscriptionId: true,
    },
  });

  const plan = subscription?.plan ?? "FREE";
  const isAdmin = session.role === "ADMIN";
  const hasCustomer = subscription?.stripeSubscriptionId != null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium">Billing</h2>
        <p className="text-muted-foreground text-sm">
          Manage your subscription, payment method, and invoices.
        </p>
      </div>

      {checkoutStatus === "success" && (
        <div className="border-success/30 bg-success/5 flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm">
          <CheckCircle2 className="text-success h-4 w-4" />
          <span>Checkout complete. Your workspace will sync to Pro within seconds.</span>
        </div>
      )}

      <section className="bg-card border-border overflow-hidden rounded-lg border">
        <header className="border-border flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium">Current plan</h3>
            <Badge
              variant={plan === "PRO" ? "default" : "secondary"}
              className="font-mono text-[10px]"
            >
              {plan.toLowerCase()}
            </Badge>
            {subscription && subscription.status !== "ACTIVE" && (
              <Badge variant="outline" className="font-mono text-[10px]">
                {STATUS_LABELS[subscription.status] ?? subscription.status.toLowerCase()}
              </Badge>
            )}
          </div>
          {subscription?.currentPeriodEnd && (
            <p className="text-muted-foreground font-mono text-xs">
              renews {subscription.currentPeriodEnd.toISOString().slice(0, 10)}
            </p>
          )}
        </header>
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <ul className="space-y-2">
            {PLAN_FEATURES[plan].map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="text-success mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col items-end justify-end gap-2">
            {plan === "FREE" && isAdmin && (
              <form action={startCheckoutAction}>
                <Button type="submit" className="gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Upgrade to Pro
                </Button>
              </form>
            )}
            {hasCustomer && isAdmin && (
              <form action={openPortalAction}>
                <Button type="submit" variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Manage in Stripe
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      {!isAdmin && (
        <p className="text-muted-foreground text-xs">
          Only admins can change the workspace plan or payment method.
        </p>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Compare plans</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["FREE", "PRO"] as const).map((p) => (
            <div key={p} className={cnPlan(p === plan)}>
              <div className="flex items-center justify-between">
                <h4 className="font-medium capitalize">{p.toLowerCase()}</h4>
                {p === plan && (
                  <Badge variant="default" className="font-mono text-[10px]">
                    current
                  </Badge>
                )}
              </div>
              <ul className="space-y-1.5">
                {PLAN_FEATURES[p].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="text-success mt-0.5 h-3 w-3 shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <p className="text-muted-foreground font-mono text-[10px]">
        <CreditCard className="mr-1 inline h-3 w-3" />
        billing is in stripe test mode for this demo deployment
      </p>
    </div>
  );
}

function cnPlan(active: boolean) {
  return [
    "bg-card rounded-lg border space-y-3 p-4",
    active ? "border-primary/40" : "border-border",
  ].join(" ");
}

import { ArrowUpRight, Check, CreditCard, ExternalLink } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { UsageMeter } from "@/components/ui/usage-meter";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { openPortalAction, startCheckoutAction } from "@/lib/billing/actions";
import { FREE_RUN_LIMIT } from "@/lib/billing/limits";
import { getRunUsage } from "@/lib/billing/usage";
import { getDb } from "@/lib/db/with-org";
import { subscriptionStatusMeta } from "@/lib/status";

const PLAN_FEATURES: Record<"FREE" | "PRO", string[]> = {
  FREE: [
    `${FREE_RUN_LIMIT} agent runs per month`,
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

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSessionOrOnboard();
  const { status: checkoutStatus } = await searchParams;
  const db = getDb(session.orgId);

  const [subscription, usage] = await Promise.all([
    db.subscription.findUnique({
      where: { orgId: session.orgId },
      select: { plan: true, status: true, currentPeriodEnd: true, stripeSubscriptionId: true },
    }),
    getRunUsage(session.orgId),
  ]);

  const plan = subscription?.plan ?? "FREE";
  const isAdmin = session.role === "ADMIN";
  const hasCustomer = subscription?.stripeSubscriptionId != null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-muted-foreground text-sm">
          Manage your subscription, usage, and payment method.
        </p>
      </div>

      {checkoutStatus === "success" && (
        <Alert variant="success">
          <Check />
          <AlertTitle>Checkout complete</AlertTitle>
          <AlertDescription>Your workspace will sync to Pro within seconds.</AlertDescription>
        </Alert>
      )}

      <section className="bg-card border-border shadow-panel space-y-4 rounded-xl border p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Current plan</h3>
            <span className="bg-violet-bg text-violet-fg border-violet-bd rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize">
              {plan.toLowerCase()}
            </span>
            {subscription && (
              <StatusPill descriptor={subscriptionStatusMeta[subscription.status]} />
            )}
          </div>
          {subscription?.currentPeriodEnd && (
            <p className="text-muted-foreground font-mono text-xs">
              renews {subscription.currentPeriodEnd.toISOString().slice(0, 10)}
            </p>
          )}
        </div>

        {usage.limit != null && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-muted-foreground">Agent runs this month</span>
              <span className="font-mono tabular-nums">
                {usage.used} / {usage.limit}
              </span>
            </div>
            <UsageMeter value={usage.used} max={usage.limit} />
            {usage.atLimit && (
              <p className="text-amber-fg text-[12.5px]">
                You&rsquo;ve hit your monthly run limit. Upgrade to Pro for unlimited runs.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {plan === "FREE" && isAdmin && (
            <form action={startCheckoutAction}>
              <Button type="submit">
                <ArrowUpRight />
                Upgrade to Pro
              </Button>
            </form>
          )}
          {hasCustomer && isAdmin && (
            <form action={openPortalAction}>
              <Button type="submit" variant="outline" size="sm">
                <ExternalLink />
                Manage in Stripe
              </Button>
            </form>
          )}
        </div>
      </section>

      {!isAdmin && (
        <p className="text-muted-foreground text-xs">
          Only admins can change the workspace plan or payment method.
        </p>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Compare plans</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["FREE", "PRO"] as const).map((p) => (
            <div
              key={p}
              className={
                "bg-card space-y-3 rounded-xl border p-4 " +
                (p === plan ? "border-primary/40" : "border-border")
              }
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold capitalize">{p.toLowerCase()}</h4>
                {p === plan && (
                  <span className="bg-primary text-primary-foreground rounded-md px-2 py-0.5 font-mono text-[10px]">
                    current
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {PLAN_FEATURES[p].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className="text-emerald-fg mt-0.5 size-3 shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <p className="text-muted-foreground font-mono text-[10px]">
        <CreditCard className="mr-1 inline size-3" />
        billing is in stripe test mode for this demo deployment
      </p>
    </div>
  );
}

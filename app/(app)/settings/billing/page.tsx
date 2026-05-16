import { CreditCard } from "lucide-react";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Billing</h2>
        <p className="text-muted-foreground text-sm">Manage your subscription and invoices.</p>
      </div>
      <div className="bg-card border-border grid place-items-center rounded-lg border border-dashed py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
            <CreditCard className="text-muted-foreground h-4 w-4" />
          </div>
          <p className="text-muted-foreground font-mono text-xs">
            stripe customer portal lands in phase 6
          </p>
        </div>
      </div>
    </div>
  );
}

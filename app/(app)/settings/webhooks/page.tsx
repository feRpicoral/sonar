import { Webhook } from "lucide-react";

import { CreateWebhookDialog } from "@/components/settings/create-webhook-dialog";
import { type DeliveryItem, WebhookRow } from "@/components/settings/webhook-row";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

export default async function WebhooksPage() {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const webhooks = await db.webhook.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      description: true,
      events: true,
      active: true,
      createdAt: true,
      deliveries: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          eventType: true,
          status: true,
          responseStatus: true,
          createdAt: true,
        },
      },
    },
  });

  const canManage = session.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium">Webhooks</h2>
          <p className="text-muted-foreground text-sm">
            Subscribe to events. Every delivery is HMAC-signed with the{" "}
            <code className="font-mono text-xs">X-Sonar-Signature</code> header.
          </p>
        </div>
        {canManage && <CreateWebhookDialog />}
      </div>

      {webhooks.length === 0 ? (
        <div className="bg-card border-border grid place-items-center rounded-lg border border-dashed py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
              <Webhook className="text-muted-foreground h-4 w-4" />
            </div>
            <p className="text-muted-foreground text-sm">
              No webhooks yet. Add one to start receiving events.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card border-border overflow-hidden rounded-lg border">
          {webhooks.map((w) => (
            <WebhookRow
              key={w.id}
              id={w.id}
              url={w.url}
              description={w.description}
              events={w.events}
              active={w.active}
              createdAt={w.createdAt}
              deliveries={w.deliveries as unknown as DeliveryItem[]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

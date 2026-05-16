import { Key } from "lucide-react";

import { ApiKeyRow } from "@/components/settings/api-key-row";
import { CreateApiKeyDialog } from "@/components/settings/create-api-key-dialog";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

export default async function ApiKeysPage() {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const keys = await db.apiKey.findMany({
    orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      last4: true,
      scopes: true,
      lastUsedAt: true,
      createdAt: true,
      revokedAt: true,
    },
  });

  const canManage = session.role === "ADMIN";
  const active = keys.filter((k) => !k.revokedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium">API keys</h2>
          <p className="text-muted-foreground text-sm">
            Generate keys for programmatic access. Scope each one to the minimum your integration
            needs.
          </p>
        </div>
        {canManage && <CreateApiKeyDialog />}
      </div>

      {keys.length === 0 ? (
        <div className="bg-card border-border grid place-items-center rounded-lg border border-dashed py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
              <Key className="text-muted-foreground h-4 w-4" />
            </div>
            <p className="text-muted-foreground text-sm">
              No keys yet. Create one to start using the public API.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card border-border overflow-hidden rounded-lg border">
          <header className="border-border border-b px-4 py-2">
            <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {active.length} active · {keys.length - active.length} revoked
            </h3>
          </header>
          {keys.map((key) => (
            <ApiKeyRow
              key={key.id}
              id={key.id}
              name={key.name}
              last4={key.last4}
              scopes={key.scopes}
              lastUsedAt={key.lastUsedAt}
              createdAt={key.createdAt}
              revokedAt={key.revokedAt}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

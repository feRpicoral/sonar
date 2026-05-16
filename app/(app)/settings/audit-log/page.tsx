import { ScrollText } from "lucide-react";

import { AuditLogFilters } from "@/components/settings/audit-log-filters";
import { AuditLogRow } from "@/components/settings/audit-log-row";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

const FILTER_PREFIX: Record<string, string> = {
  lead: "lead.",
  run: "run.",
  email: "email.",
  member: "member.",
  api_key: "api_key.",
  webhook: "webhook.",
  org: "org.",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);
  const { filter } = await searchParams;

  const prefix = filter ? FILTER_PREFIX[filter] : undefined;

  const entries = await db.auditLog.findMany({
    where: prefix ? { action: { startsWith: prefix } } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      targetType: true,
      metadata: true,
      createdAt: true,
      actor: { select: { name: true, email: true, avatarUrl: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Activity</h2>
        <p className="text-muted-foreground text-sm">
          Every mutating action in this workspace. Showing the most recent 100.
        </p>
      </div>

      <AuditLogFilters />

      {entries.length === 0 ? (
        <div className="bg-card border-border grid place-items-center rounded-lg border border-dashed py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
              <ScrollText className="text-muted-foreground h-4 w-4" />
            </div>
            <p className="text-muted-foreground text-sm">No activity matches this filter yet.</p>
          </div>
        </div>
      ) : (
        <ul className="bg-card border-border overflow-hidden rounded-lg border">
          {entries.map((entry) => (
            <AuditLogRow
              key={entry.id}
              id={entry.id}
              action={entry.action}
              actor={entry.actor}
              targetType={entry.targetType}
              metadata={(entry.metadata as Record<string, unknown>) ?? {}}
              createdAt={entry.createdAt}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

import { formatDistanceToNow } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ACTION_LABELS: Record<string, string> = {
  "org.created": "Created workspace",
  "org.updated": "Updated workspace",
  "org.deleted": "Deleted workspace",
  "member.invited": "Invited member",
  "member.joined": "Joined workspace",
  "member.removed": "Removed member",
  "member.role_changed": "Changed member role",
  "lead.created": "Created lead",
  "lead.updated": "Updated lead",
  "lead.deleted": "Deleted lead",
  "lead.restored": "Restored lead",
  "lead.assigned": "Reassigned lead",
  "call.uploaded": "Uploaded call",
  "call.deleted": "Deleted call",
  "run.started": "Started agent run",
  "run.completed": "Completed agent run",
  "run.failed": "Agent run failed",
  "email.approved": "Approved email",
  "email.regenerated": "Regenerated email",
  "email.sent": "Sent email",
  "api_key.created": "Created API key",
  "api_key.revoked": "Revoked API key",
  "webhook.created": "Created webhook",
  "webhook.updated": "Updated webhook",
  "webhook.deleted": "Deleted webhook",
  "webhook.secret_rotated": "Rotated webhook secret",
  "subscription.changed": "Updated subscription",
};

function initials(s: string) {
  return (
    s
      .split(/[\s@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

export interface AuditLogRowProps {
  id: string;
  action: string;
  actor: {
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
  targetType: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export function AuditLogRow({ action, actor, targetType, metadata, createdAt }: AuditLogRowProps) {
  const label = ACTION_LABELS[action] ?? action;
  const actorLabel = actor ? (actor.name ?? actor.email) : "System";
  const detail = formatMetadata(metadata, action);

  return (
    <li className="border-border grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b px-4 py-3 last:border-b-0">
      <Avatar className="h-6 w-6">
        {actor?.avatarUrl && <AvatarImage src={actor.avatarUrl} alt={actor.name ?? actor.email} />}
        <AvatarFallback className="text-[9px]">{initials(actorLabel)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm">
          <span className="font-medium">{actorLabel}</span>{" "}
          <span className="text-muted-foreground">{label.toLowerCase()}</span>
          {detail && <span className="text-muted-foreground">: {detail}</span>}
        </p>
        <p className="text-muted-foreground font-mono text-[10px]">
          {action}
          {targetType && ` · ${targetType}`}
        </p>
      </div>
      <span className="text-muted-foreground font-mono text-[10px] whitespace-nowrap tabular-nums">
        {formatDistanceToNow(createdAt, { addSuffix: true })}
      </span>
    </li>
  );
}

function formatMetadata(metadata: Record<string, unknown>, action: string): string | null {
  if (!metadata || Object.keys(metadata).length === 0) return null;
  const m = metadata as { name?: unknown; role?: unknown; status?: unknown; to?: unknown };
  if (action.startsWith("lead.")) {
    return typeof m.name === "string" ? m.name : null;
  }
  if (action.startsWith("member.")) {
    return typeof m.role === "string" ? `as ${(m.role as string).toLowerCase()}` : null;
  }
  if (action.startsWith("email.")) {
    return typeof m.to === "string" ? `to ${m.to}` : null;
  }
  if (action.startsWith("org.")) {
    return typeof m.name === "string" ? m.name : null;
  }
  return null;
}

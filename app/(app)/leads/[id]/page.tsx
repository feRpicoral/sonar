import { ArrowLeft, ExternalLink, Mic } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

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

const STATUS_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery",
  QUALIFIED: "Qualified",
  DEMO: "Demo",
  PROPOSAL: "Proposal",
  CLOSED: "Closed",
};

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);

  const lead = await db.lead.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      companyName: true,
      companyWebsite: true,
      status: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { name: true, email: true, avatarUrl: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!lead || lead.deletedAt) notFound();

  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link
          href="/leads"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to leads
        </Link>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{lead.name}</h1>
            {lead.companyName && (
              <p className="text-muted-foreground text-sm">
                {lead.companyWebsite ? (
                  <a
                    href={lead.companyWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground inline-flex items-center gap-1 hover:underline"
                  >
                    {lead.companyName}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  lead.companyName
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-mono text-[10px]">
              {STATUS_LABELS[lead.status]}
            </Badge>
            <Button size="sm" disabled className="gap-1.5">
              <Mic className="h-3.5 w-3.5" />
              Upload call
            </Button>
          </div>
        </header>

        <section className="bg-card border-border grid gap-6 rounded-lg border p-6 sm:grid-cols-3">
          <Field label="Assigned to">
            {lead.assignedTo ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={lead.assignedTo.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[9px]">
                    {initials(lead.assignedTo.name ?? lead.assignedTo.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{lead.assignedTo.name ?? lead.assignedTo.email}</span>
              </div>
            ) : (
              <span className="text-muted-foreground font-mono text-xs">unassigned</span>
            )}
          </Field>
          <Field label="Created by">
            <span className="text-sm">{lead.createdBy.name ?? lead.createdBy.email}</span>
          </Field>
          <Field label="Last activity">
            <span className="text-muted-foreground font-mono text-xs">
              {lead.updatedAt.toISOString().slice(0, 10)}
            </span>
          </Field>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium">Timeline</h2>
          <div className="bg-card border-border grid place-items-center rounded-lg border border-dashed py-16">
            <p className="text-muted-foreground font-mono text-xs">
              calls + agent runs + emails land here in phase 3+
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs tracking-wide uppercase">{label}</div>
      <div>{children}</div>
    </div>
  );
}

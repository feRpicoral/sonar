import { InviteMemberDialog } from "@/components/settings/invite-member-dialog";
import { InviteRow } from "@/components/settings/invite-row";
import { MemberRow } from "@/components/settings/member-row";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

export default async function MembersPage() {
  const session = await requireSessionOrOnboard();
  const db = getDb(session.orgId);
  const prisma = (await import("@/lib/db/client")).getPrisma();
  const canManage = session.role === "ADMIN";

  // Pending invites carry bearer tokens (the accept-invite URL). Only admins,
  // who can create and revoke invites, may see them - a member must never be
  // able to copy an open ADMIN invite link.
  const [memberships, pendingInvites] = await Promise.all([
    prisma.membership.findMany({
      where: { orgId: session.orgId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, email: true, name: true, avatarUrl: true } },
      },
    }),
    canManage
      ? db.invite.findMany({
          where: { acceptedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
          select: { id: true, email: true, role: true, token: true, expiresAt: true },
        })
      : [],
  ]);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium">Members</h2>
          <p className="text-muted-foreground text-sm">Manage who has access to this workspace.</p>
        </div>
        {canManage && <InviteMemberDialog />}
      </div>

      <section className="space-y-1">
        <div className="bg-card border-border overflow-hidden rounded-lg border">
          <div className="border-border border-b px-4 py-2">
            <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {memberships.length} member{memberships.length === 1 ? "" : "s"}
            </h3>
          </div>
          <div className="px-4">
            {memberships.map((m) => (
              <MemberRow
                key={m.id}
                id={m.id}
                role={m.role}
                user={m.user}
                isSelf={m.user.id === session.userId}
                canManage={canManage}
              />
            ))}
          </div>
        </div>
      </section>

      {pendingInvites.length > 0 && (
        <section className="space-y-1">
          <div className="bg-card border-border overflow-hidden rounded-lg border">
            <div className="border-border border-b px-4 py-2">
              <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {pendingInvites.length} pending invite{pendingInvites.length === 1 ? "" : "s"}
              </h3>
            </div>
            <div className="px-4">
              {pendingInvites.map((inv) => (
                <InviteRow
                  key={inv.id}
                  email={inv.email}
                  role={inv.role}
                  url={`${base}/accept-invite/${inv.token}`}
                  expiresAt={inv.expiresAt}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

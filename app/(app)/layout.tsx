import { MobileTopbar } from "@/components/app-shell/mobile-topbar";
import { Sidebar } from "@/components/app-shell/sidebar";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionOrOnboard();

  const prisma = getPrisma();
  const [user, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, name: true, avatarUrl: true },
    }),
    prisma.membership.findMany({
      where: { userId: session.userId },
      select: {
        role: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const orgs = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
  }));
  const current = orgs.find((o) => o.id === session.orgId) ?? orgs[0]!;
  const safeUser = user ?? { email: session.email, name: null, avatarUrl: null };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <Sidebar className="hidden lg:flex" current={current} orgs={orgs} user={safeUser} />
      <MobileTopbar className="lg:hidden" current={current} orgs={orgs} user={safeUser} />
      <main className="bg-background flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

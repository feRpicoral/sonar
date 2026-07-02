import { cn } from "@/lib/utils";

import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { type OrgItem, WorkspaceSwitcher } from "./workspace-switcher";

export interface SidebarUser {
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export function SidebarBody({
  current,
  orgs,
  user,
  leadsCount,
}: {
  current: OrgItem;
  orgs: OrgItem[];
  user: SidebarUser;
  leadsCount?: number;
}) {
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <WorkspaceSwitcher current={current} orgs={orgs} />
      <SidebarNav leadsCount={leadsCount} />
      <UserMenu user={user} />
    </div>
  );
}

export function Sidebar({
  current,
  orgs,
  user,
  leadsCount,
  className,
}: {
  current: OrgItem;
  orgs: OrgItem[];
  user: SidebarUser;
  leadsCount?: number;
  className?: string;
}) {
  return (
    <aside
      className={cn("bg-bg-subtle border-border flex w-60 shrink-0 flex-col border-r", className)}
    >
      <SidebarBody current={current} orgs={orgs} user={user} leadsCount={leadsCount} />
    </aside>
  );
}

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
}: {
  current: OrgItem;
  orgs: OrgItem[];
  user: SidebarUser;
}) {
  return (
    <>
      <div className="border-border border-b p-3">
        <WorkspaceSwitcher current={current} orgs={orgs} />
      </div>
      <SidebarNav />
      <div className="border-border mt-auto border-t p-3">
        <UserMenu user={user} />
      </div>
    </>
  );
}

export function Sidebar({
  current,
  orgs,
  user,
  className,
}: {
  current: OrgItem;
  orgs: OrgItem[];
  user: SidebarUser;
  className?: string;
}) {
  return (
    <aside className={cn("bg-card border-border flex w-60 shrink-0 flex-col border-r", className)}>
      <SidebarBody current={current} orgs={orgs} user={user} />
    </aside>
  );
}

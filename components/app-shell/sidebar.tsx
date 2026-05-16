import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { type OrgItem, WorkspaceSwitcher } from "./workspace-switcher";

export function Sidebar({
  current,
  orgs,
  user,
}: {
  current: OrgItem;
  orgs: OrgItem[];
  user: { email: string; name: string | null; avatarUrl: string | null };
}) {
  return (
    <aside className="bg-card border-border flex w-60 shrink-0 flex-col border-r">
      <div className="border-border border-b p-3">
        <WorkspaceSwitcher current={current} orgs={orgs} />
      </div>
      <SidebarNav />
      <div className="border-border border-t p-3">
        <UserMenu user={user} />
      </div>
    </aside>
  );
}

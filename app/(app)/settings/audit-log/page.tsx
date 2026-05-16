import { ScrollText } from "lucide-react";

export default function AuditLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Activity</h2>
        <p className="text-muted-foreground text-sm">
          Every mutating action in this workspace, filterable by actor and action.
        </p>
      </div>
      <div className="bg-card border-border grid place-items-center rounded-lg border border-dashed py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
            <ScrollText className="text-muted-foreground h-4 w-4" />
          </div>
          <p className="text-muted-foreground font-mono text-xs">
            filterable audit log UI lands in phase 7
          </p>
        </div>
      </div>
    </div>
  );
}

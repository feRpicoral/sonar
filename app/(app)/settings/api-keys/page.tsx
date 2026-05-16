import { Key } from "lucide-react";

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">API keys</h2>
        <p className="text-muted-foreground text-sm">
          Generate keys for programmatic access to your workspace.
        </p>
      </div>
      <div className="bg-card border-border grid place-items-center rounded-lg border border-dashed py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
            <Key className="text-muted-foreground h-4 w-4" />
          </div>
          <p className="text-muted-foreground font-mono text-xs">
            scoped keys + last-used tracking land in phase 7
          </p>
        </div>
      </div>
    </div>
  );
}

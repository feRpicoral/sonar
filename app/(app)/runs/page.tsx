import { Activity } from "lucide-react";

export default function RunsPage() {
  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12">
          <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
        </header>
        <div className="border-border bg-card grid place-items-center rounded-lg border border-dashed py-24">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
              <Activity className="text-muted-foreground h-5 w-5" />
            </div>
            <p className="text-muted-foreground font-mono text-xs">
              streaming agent run viewer lands in phase 4
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

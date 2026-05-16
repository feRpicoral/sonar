import { Sparkles } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Welcome back.</p>
        </header>

        <div className="border-border bg-card grid place-items-center rounded-lg border border-dashed py-24">
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
              <Sparkles className="text-primary h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="font-medium">Your pipeline starts here</h2>
              <p className="text-muted-foreground text-sm">
                Add your first lead to start running calls and generating follow-ups.
              </p>
            </div>
            <p className="text-muted-foreground font-mono text-xs">
              leads + agent runs land in phase 2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 py-24">
        <div className="flex items-center gap-2">
          <span className="bg-primary h-1.5 w-1.5 rounded-full" aria-hidden />
          <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Sonar
          </span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          AI sales enablement workspace.
        </h1>
        <p className="text-muted-foreground max-w-prose text-lg leading-relaxed text-pretty">
          Multi-agent orchestration for sales teams. Upload a call, get research, analysis,
          strategy, and a follow-up email — in seconds.
        </p>
        <div className="flex items-center gap-3 pt-2 text-sm">
          <span className="border-border bg-card text-muted-foreground inline-flex h-7 items-center rounded-full border px-3 font-mono text-xs">
            in development
          </span>
          <Link
            href="https://github.com/feRpicoral/sonar"
            className="text-muted-foreground hover:text-foreground font-mono text-xs underline-offset-4 hover:underline"
          >
            github →
          </Link>
        </div>
      </div>
    </main>
  );
}

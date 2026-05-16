import { ArrowRight, GitBranch, Mic, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const PILLARS = [
  {
    icon: Sparkles,
    title: "Multi-agent with state",
    description:
      "Four sequential nodes (research, analysis, strategy, writer), each returning Zod-validated structured output. Run pauses at the writer step for human approval, with re-runnable writer only.",
  },
  {
    icon: Mic,
    title: "Audio with citations",
    description:
      "Groq Whisper Large v3 transcribes calls with segment timestamps. The writer node emits citations linking email phrases back to specific transcript segments. Hover to verify, click to jump.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-tenant B2B",
    description:
      "Three layers of tenant isolation: branded TypeScript IDs at call sites, Prisma $extends middleware that auto-injects orgId, and Postgres RLS as a backstop. Stripe billing, scoped API keys, HMAC webhooks, full audit log.",
  },
];

const STEPS = [
  "Research. Tavily web search plus Claude Haiku 4.5 produces a structured prospect profile (segment, signals, likely pain points).",
  "Transcription. Groq Whisper Large v3 returns segments with timestamps. Skipped if no audio is attached.",
  "Analysis. Claude Sonnet 4.6 extracts topics, confirmed pain points, objections, action items, sentiment, and key quotes. Each quote carries the index of its source segment.",
  "Strategy. Claude Sonnet 4.6 picks a next step (follow-up, demo, proposal, nurture), an urgency, and 3 to 5 specific talking points.",
  "Writer. Claude Sonnet 4.6 drafts a 100 to 150 word email with citations to specific transcript segments. The reviewer edits in place or regenerates with feedback.",
];

export default function HomePage() {
  return (
    <main className="bg-background min-h-screen">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="bg-primary h-1.5 w-1.5 rounded-full" aria-hidden />
            <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Sonar
            </span>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <Link
              href="/docs"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </Link>
            <Link
              href="https://github.com/feRpicoral/sonar"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Button size="sm" asChild className="gap-1.5">
              <Link href="/signup">
                Try the demo
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="bg-muted text-muted-foreground mx-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] tracking-widest uppercase">
          <span className="bg-primary h-1.5 w-1.5 rounded-full" aria-hidden />
          AI sales enablement workspace
        </div>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Upload a sales call. Get research, analysis, strategy, and a follow-up email back in
          seconds.
        </h1>
        <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty">
          Multi-agent orchestration over your sales pipeline. Hover any phrase in the generated
          email to see the exact transcript moment it came from. Edit, regenerate with feedback,
          then send.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Button size="lg" asChild className="gap-1.5">
            <Link href="/signup">
              Open the demo workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/docs">Read the API docs</Link>
          </Button>
        </div>
      </section>

      <section className="bg-card border-border border-y">
        <div className="mx-auto grid max-w-5xl gap-6 px-6 py-16 sm:grid-cols-3">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="space-y-3">
                <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-md">
                  <Icon className="text-primary h-4 w-4" />
                </div>
                <h2 className="text-base font-medium">{p.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{p.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">How the agent run works</h2>
        <ol className="mt-6 space-y-4 text-sm">
          {STEPS.map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="text-muted-foreground bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-primary h-1.5 w-1.5 rounded-full" aria-hidden />
            <span className="font-mono tracking-widest uppercase">Sonar</span>
            <span className="font-mono">/ portfolio demo</span>
          </div>
          <Link
            href="https://github.com/feRpicoral/sonar"
            className="hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <GitBranch className="h-3 w-3" />
            feRpicoral/sonar
          </Link>
        </div>
      </footer>
    </main>
  );
}

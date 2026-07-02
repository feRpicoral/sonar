"use client";

import { ArrowRight, Check, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Marker, NodeRow } from "@/components/ui/node-rail";
import { StatusPill } from "@/components/ui/status-pill";
import { retryRunAction } from "@/lib/runs/actions";
import { stepStatusMeta } from "@/lib/status";
import { formatTimestamp } from "@/lib/transcription/whisper";
import { cn } from "@/lib/utils";

type StepStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";

const NODES = [
  {
    node: "TRANSCRIPTION",
    label: "Transcription",
    capability: "Whisper Large v3 · segments + timestamps",
  },
  { node: "RESEARCH", label: "Research", capability: "Company profile via Haiku 4.5 + Tavily" },
  {
    node: "ANALYSIS",
    label: "Call analysis",
    capability: "Topics, pain points, objections via Sonnet 4.6",
  },
  { node: "STRATEGY", label: "Strategy", capability: "Next step + talking points via Sonnet 4.6" },
  { node: "WRITER", label: "Email draft", capability: "Follow-up with citations via Sonnet 4.6" },
] as const;

export interface RunStep {
  node: string;
  status: StepStatus;
  output: unknown;
  errorMessage: string | null;
  errorCode: string | null;
}

export interface RunViewerProps {
  runId: string;
  runStatus: string;
  leadName: string;
  steps: RunStep[];
  call: { segmentCount: number; durationSec: number | null } | null;
  emailDraft: { id: string; status: string } | null;
}

const MARKER_VARIANT: Record<StepStatus, "emerald" | "violet" | "rose" | "dashed" | "default"> = {
  COMPLETED: "emerald",
  RUNNING: "violet",
  FAILED: "rose",
  SKIPPED: "dashed",
  PENDING: "default",
};

export function RunViewerClient({
  runId,
  runStatus,
  leadName,
  steps,
  call,
  emailDraft,
}: RunViewerProps) {
  const router = useRouter();
  const isActive = runStatus === "PENDING" || runStatus === "RUNNING";

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => router.refresh(), 1500);
    return () => clearInterval(interval);
  }, [isActive, router]);

  const byNode = new Map(steps.map((s) => [s.node, s]));

  const resolved = NODES.map((meta) => {
    if (meta.node === "TRANSCRIPTION") {
      const status: StepStatus = call ? "COMPLETED" : "SKIPPED";
      const detail = call
        ? `${call.segmentCount} segments${call.durationSec != null ? ` · ${formatTimestamp(call.durationSec)}` : ""}`
        : "No call attached";
      return { meta, status, output: null, errorMessage: null, errorCode: null, detail };
    }
    const step = byNode.get(meta.node);
    return {
      meta,
      status: (step?.status as StepStatus | undefined) ?? "PENDING",
      output: step?.output ?? null,
      errorMessage: step?.errorMessage ?? null,
      errorCode: step?.errorCode ?? null,
      detail: null as string | null,
    };
  });

  return (
    <div className="space-y-4">
      {isActive && <PollChip />}

      <div>
        {resolved.map((row, i) => {
          const last = i === resolved.length - 1;
          const completedLink =
            row.status === "COMPLETED" && resolved[i + 1]?.status === "COMPLETED";
          return (
            <NodeRow
              key={row.meta.node}
              last={last}
              line={completedLink ? "emerald" : "default"}
              marker={
                <Marker variant={MARKER_VARIANT[row.status]} pulse={row.status === "RUNNING"}>
                  <NodeMarkerIcon status={row.status} index={i} />
                </Marker>
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {String(i).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-semibold">{row.meta.label}</span>
                </div>
                <StatusPill descriptor={stepStatusMeta[row.status]} />
              </div>
              <p className="text-muted-foreground mt-0.5 text-[12.5px]">
                {row.detail ?? row.meta.capability}
              </p>

              {row.status === "FAILED" && row.errorMessage && (
                <div className="border-rose-bd bg-rose-bg/40 text-rose-fg mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-[12.5px]">
                  {row.errorCode && (
                    <span className="bg-rose-bg border-rose-bd shrink-0 rounded border px-1 font-mono text-[10px]">
                      {row.errorCode}
                    </span>
                  )}
                  <span className="min-w-0">{row.errorMessage}</span>
                </div>
              )}

              {row.status === "COMPLETED" && row.output != null && (
                <NodeOutput node={row.meta.node} output={row.output} />
              )}
            </NodeRow>
          );
        })}
      </div>

      {runStatus === "FAILED" && <FailedBanner runId={runId} />}
      {emailDraft && (runStatus === "AWAITING_APPROVAL" || runStatus === "COMPLETED") && (
        <DraftBanner draft={emailDraft} leadName={leadName} />
      )}
    </div>
  );
}

function NodeMarkerIcon({ status, index }: { status: StepStatus; index: number }) {
  if (status === "COMPLETED") return <Check />;
  if (status === "PENDING")
    return (
      <span className="font-mono text-[10px] font-semibold">{String(index).padStart(2, "0")}</span>
    );
  const meta = stepStatusMeta[status];
  const Icon = meta.icon;
  return <Icon className={cn(meta.spin && "animate-spin")} />;
}

function PollChip() {
  return (
    <div className="text-muted-foreground inline-flex items-center gap-1.5 text-[11.5px]">
      <span className="bg-primary size-1.5 animate-pulse rounded-full" />
      Live · refreshing every 1.5s
    </div>
  );
}

function FailedBanner({ runId }: { runId: string }) {
  const [isPending, startTransition] = useTransition();
  const onRetry = () =>
    startTransition(async () => {
      const result = await retryRunAction(runId);
      if (result.error) toast.error(result.error);
      else toast.success("Run restarted");
    });
  return (
    <div className="border-rose-bd bg-rose-bg/40 flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
      <div>
        <p className="text-rose-fg text-sm font-semibold">Run failed</p>
        <p className="text-muted-foreground text-[12.5px]">
          Retry to re-run the pipeline from the start.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry} disabled={isPending}>
        <RefreshCw className={cn(isPending && "animate-spin")} />
        {isPending ? "Restarting…" : "Retry run"}
      </Button>
    </div>
  );
}

function DraftBanner({
  draft,
  leadName,
}: {
  draft: { id: string; status: string };
  leadName: string;
}) {
  const sent = draft.status === "SENT";
  return (
    <div className="bg-card border-primary/30 shadow-panel flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{sent ? "Email sent" : "Email draft ready"}</p>
        <p className="text-muted-foreground text-[12.5px]">
          {sent
            ? "Open the draft to see citations and delivery status."
            : `Review, edit, or regenerate the follow-up to ${leadName}.`}
        </p>
      </div>
      <Button asChild size="sm">
        <Link href={`/emails/${draft.id}/approve`}>
          {sent ? "View" : "Review"}
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

function NodeOutput({ node, output }: { node: string; output: unknown }) {
  if (node === "RESEARCH") return <ResearchOutputCard output={output as ResearchShape} />;
  if (node === "ANALYSIS") return <AnalysisOutputCard output={output as AnalysisShape} />;
  if (node === "STRATEGY") return <StrategyOutputCard output={output as StrategyShape} />;
  if (node === "WRITER") return <WriterOutputCard output={output as WriterShape} />;
  return null;
}

function OutputCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border-border-2 mt-2.5 space-y-3 rounded-lg border p-3.5 text-[13px]">
      {children}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-border bg-muted text-fg-2 rounded-md border px-2 py-0.5 text-[11.5px]">
      {children}
    </span>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-muted-foreground mb-1 font-mono text-[10px] tracking-wider uppercase">
        {title}
      </p>
      <ul className="list-disc space-y-0.5 pl-4 leading-relaxed">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

interface ResearchShape {
  segment?: string;
  industry?: string;
  fundingStage?: string;
  employeeCount?: string;
  location?: string;
  amountRaised?: string;
  website?: string;
  summary?: string;
  signals?: string[];
  likelyPainPoints?: string[];
  sources?: { name: string; url: string }[];
}

function ResearchOutputCard({ output }: { output: ResearchShape }) {
  const facts = [
    output.industry,
    output.fundingStage,
    output.employeeCount,
    output.location,
    output.amountRaised,
  ].filter(Boolean) as string[];
  return (
    <OutputCard>
      {facts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {facts.map((f, i) => (
            <Chip key={i}>{f}</Chip>
          ))}
        </div>
      )}
      {output.summary && <p className="leading-relaxed">{output.summary}</p>}
      <Section title="Signals" items={output.signals ?? []} />
      <Section title="Likely pain points" items={output.likelyPainPoints ?? []} />
      {output.sources && output.sources.length > 0 && (
        <p className="text-muted-foreground text-[11.5px]">
          {output.sources.length} sources · {output.sources.map((s) => s.name).join(", ")}
        </p>
      )}
    </OutputCard>
  );
}

interface AnalysisShape {
  topics?: string[];
  confirmedPainPoints?: string[];
  objections?: string[];
  actionItems?: string[];
  sentiment?: string;
  sentimentConfidence?: number;
  keyQuotes?: { text: string }[];
}

function AnalysisOutputCard({ output }: { output: AnalysisShape }) {
  return (
    <OutputCard>
      {output.sentiment && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
            Sentiment
          </span>
          <span className="font-medium capitalize">{output.sentiment}</span>
          {output.sentimentConfidence != null && (
            <span className="text-muted-foreground font-mono text-[11px]">
              confidence {output.sentimentConfidence.toFixed(2)}
            </span>
          )}
        </div>
      )}
      {output.topics && output.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {output.topics.map((t, i) => (
            <Chip key={i}>{t}</Chip>
          ))}
        </div>
      )}
      <Section title="Confirmed pain points" items={output.confirmedPainPoints ?? []} />
      <Section title="Objections" items={output.objections ?? []} />
      {output.actionItems && output.actionItems.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 font-mono text-[10px] tracking-wider uppercase">
            Action items
          </p>
          <ul className="space-y-1">
            {output.actionItems.map((it, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="border-border-strong mt-0.5 inline-flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border" />
                {it}
              </li>
            ))}
          </ul>
        </div>
      )}
    </OutputCard>
  );
}

interface StrategyShape {
  nextStep?: string;
  urgency?: string;
  talkingPoints?: string[];
  reasoning?: string;
}

function StrategyOutputCard({ output }: { output: StrategyShape }) {
  return (
    <OutputCard>
      <div className="flex flex-wrap gap-1.5">
        {output.nextStep && <Chip>Next: {output.nextStep.replace(/-/g, " ")}</Chip>}
        {output.urgency && <Chip>Urgency: {output.urgency}</Chip>}
      </div>
      <Section title="Talking points" items={output.talkingPoints ?? []} />
      {output.reasoning && (
        <p className="text-muted-foreground leading-relaxed">{output.reasoning}</p>
      )}
    </OutputCard>
  );
}

interface WriterShape {
  subject?: string;
  body?: string;
  citations?: unknown[];
}

function WriterOutputCard({ output }: { output: WriterShape }) {
  return (
    <OutputCard>
      {output.subject && <p className="font-semibold">{output.subject}</p>}
      {output.body && (
        <p className="text-muted-foreground line-clamp-4 leading-relaxed whitespace-pre-wrap">
          {output.body}
        </p>
      )}
      {output.citations && (
        <p className="text-muted-foreground text-[11.5px]">{output.citations.length} citations</p>
      )}
    </OutputCard>
  );
}

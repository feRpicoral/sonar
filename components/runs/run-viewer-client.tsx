"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AgentStepCard, type StepStatus } from "./agent-step-card";

const NODE_ORDER = ["RESEARCH", "ANALYSIS", "STRATEGY", "WRITER"] as const;
type NodeName = (typeof NODE_ORDER)[number];

const META: Record<NodeName, { label: string; description: string }> = {
  RESEARCH: {
    label: "Research",
    description: "Web search + company profile via Haiku 4.5 + Tavily",
  },
  ANALYSIS: {
    label: "Call analysis",
    description: "Topics, pain points, objections, action items via Sonnet 4.6",
  },
  STRATEGY: {
    label: "Strategy",
    description: "Next step + talking points + urgency via Sonnet 4.6",
  },
  WRITER: {
    label: "Email draft",
    description: "Follow-up email with citations via Sonnet 4.6",
  },
};

export interface RunStep {
  node: string;
  status: StepStatus;
  output: unknown;
  errorMessage: string | null;
}

export function RunViewerClient({ runStatus, steps }: { runStatus: string; steps: RunStep[] }) {
  const router = useRouter();
  const isActive = runStatus === "PENDING" || runStatus === "RUNNING";

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => router.refresh(), 1500);
    return () => clearInterval(interval);
  }, [isActive, router]);

  const stepByNode = new Map(steps.map((s) => [s.node, s]));

  return (
    <div className="space-y-3">
      {NODE_ORDER.map((node, i) => {
        const step = stepByNode.get(node);
        return (
          <AgentStepCard
            key={node}
            index={i}
            label={META[node].label}
            description={META[node].description}
            status={(step?.status as StepStatus | undefined) ?? "PENDING"}
            output={step?.output}
            errorMessage={step?.errorMessage}
          />
        );
      })}
    </div>
  );
}

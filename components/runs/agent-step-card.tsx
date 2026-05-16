"use client";

import { AlertCircle, Check, ChevronDown, CircleDashed, Loader2, MinusCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export type StepStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";

export interface AgentStepCardProps {
  index: number;
  label: string;
  description: string;
  status: StepStatus;
  output?: unknown;
  errorMessage?: string | null;
}

function StatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "RUNNING":
      return <Loader2 className="text-primary h-4 w-4 animate-spin" />;
    case "COMPLETED":
      return <Check className="text-success h-4 w-4" />;
    case "FAILED":
      return <AlertCircle className="text-destructive h-4 w-4" />;
    case "SKIPPED":
      return <MinusCircle className="text-muted-foreground h-4 w-4" />;
    case "PENDING":
    default:
      return <CircleDashed className="text-muted-foreground h-4 w-4" />;
  }
}

export function AgentStepCard({
  index,
  label,
  description,
  status,
  output,
  errorMessage,
}: AgentStepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = status === "COMPLETED" && output != null;
  const showFailure = status === "FAILED" && errorMessage;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.2 }}
      className={cn(
        "bg-card rounded-lg border transition-colors",
        status === "RUNNING" && "border-primary/40 shadow-primary/5 shadow-sm",
        status === "COMPLETED" && "border-border",
        status === "FAILED" && "border-destructive/40",
        (status === "PENDING" || status === "SKIPPED") && "border-border opacity-70",
      )}
    >
      <button
        type="button"
        disabled={!canExpand}
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
          canExpand && "hover:bg-muted/30 cursor-pointer",
          !canExpand && "cursor-default",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <StatusIcon status={status} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-muted-foreground font-mono text-[10px]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{label}</span>
            </div>
            <p className="text-muted-foreground truncate text-xs">{description}</p>
          </div>
        </div>
        {canExpand && (
          <ChevronDown
            className={cn(
              "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
              expanded && "rotate-180",
            )}
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && canExpand && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="border-border overflow-hidden border-t"
          >
            <pre className="text-muted-foreground max-h-72 overflow-auto px-4 py-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
              {JSON.stringify(output, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {showFailure && (
        <div className="text-destructive border-destructive/30 bg-destructive/5 border-t px-4 py-2 font-mono text-[11px]">
          {errorMessage}
        </div>
      )}
    </motion.article>
  );
}

"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function GenerateFollowupButton({ leadId, callId }: { leadId: string; callId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const response = await fetch("/api/runs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, callId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: response.statusText }));
        toast.error(body.error ?? "Failed to start run");
        return;
      }
      const { runId } = (await response.json()) as { runId: string };
      router.push(`/runs/${runId}`);
    });
  };

  return (
    <Button size="sm" className="gap-1.5" onClick={onClick} disabled={isPending}>
      <Sparkles className="h-3.5 w-3.5" />
      {isPending ? "Starting…" : "Generate follow-up"}
    </Button>
  );
}

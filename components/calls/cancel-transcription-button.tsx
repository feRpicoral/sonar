"use client";

import { Loader2, X } from "lucide-react";
import { type MouseEvent, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cancelCallTranscriptionAction } from "@/lib/calls/actions";

/**
 * Compact X-icon button shown on stuck "Transcribing…" rows in the lead
 * detail page. Soft-deletes the Call row so the orphaned entry disappears.
 * Use inside a clickable Link parent - the click handler stops propagation
 * so the navigation doesn't fire.
 */
export function CancelTranscriptionButton({ callId }: { callId: string }) {
  const [isPending, startTransition] = useTransition();

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await cancelCallTranscriptionAction(callId);
      if (result.error) toast.error(result.error);
      else toast.success("Transcription cancelled");
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-destructive h-7 w-7"
      onClick={onClick}
      disabled={isPending}
      aria-label="Cancel transcription"
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
    </Button>
  );
}

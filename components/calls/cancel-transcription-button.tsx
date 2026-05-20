"use client";

import { type MouseEvent, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cancelCallTranscriptionAction } from "@/lib/calls/actions";

/**
 * Cancel button shown on stuck "Transcribing…" rows in the lead detail page.
 * Soft-deletes the Call row so the orphaned entry disappears. Use inside a
 * clickable Link parent - the click handler stops propagation so the
 * navigation doesn't fire.
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
      variant="outline"
      size="sm"
      className="h-7 px-2.5 text-xs"
      onClick={onClick}
      disabled={isPending}
    >
      {isPending ? "Cancelling…" : "Cancel"}
    </Button>
  );
}

"use client";

import { type MouseEvent, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cancelCallTranscriptionAction } from "@/lib/calls/actions";

export function CancelTranscriptionButton({ callId }: { callId: string }) {
  const [isPending, startTransition] = useTransition();

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    // The parent row is a link; cancel should not open the transcript page.
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

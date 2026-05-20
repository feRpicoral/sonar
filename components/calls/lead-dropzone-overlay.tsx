"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cancelCallTranscriptionAction } from "@/lib/calls/actions";
import { uploadCallFile, type UploadStage } from "@/lib/calls/upload-call-file";

/**
 * Wraps the lead detail page so dragging an audio file anywhere on the page
 * triggers an upload + transcription. Pairs with UploadCallDialog (which
 * exposes the same flow through a button + dialog).
 */
export function LeadDropzoneOverlay({
  leadId,
  children,
}: {
  leadId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<UploadStage>("idle");
  // Counter handles the dragenter/dragleave cascade as the cursor moves
  // between nested elements within the page.
  const dragCount = useRef(0);
  // Read inside async drop handler without re-binding window listeners on
  // every stage transition.
  const stageRef = useRef<UploadStage>("idle");
  const abortRef = useRef<AbortController | null>(null);
  const callIdRef = useRef<string | null>(null);

  const updateStage = (next: UploadStage) => {
    stageRef.current = next;
    setStage(next);
  };

  const resetWorkState = () => {
    updateStage("idle");
    abortRef.current = null;
    callIdRef.current = null;
  };

  const onCancel = () => {
    abortRef.current?.abort();
    const id = callIdRef.current;
    if (id) void cancelCallTranscriptionAction(id);
    toast.info("Transcription cancelled");
    resetWorkState();
  };

  useEffect(() => {
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types?.includes("Files") ?? false;

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragCount.current += 1;
      setDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragCount.current -= 1;
      if (dragCount.current <= 0) {
        dragCount.current = 0;
        setDragging(false);
      }
    };
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      // Preventing default tells the browser this is a valid drop target.
      e.preventDefault();
    };
    const onDrop = async (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCount.current = 0;
      setDragging(false);
      if (stageRef.current !== "idle") return;
      const file = e.dataTransfer?.files[0];
      if (!file) return;

      const controller = new AbortController();
      abortRef.current = controller;
      callIdRef.current = null;

      const result = await uploadCallFile(file, leadId, {
        onStageChange: updateStage,
        onCallCreated: (id) => {
          callIdRef.current = id;
        },
        signal: controller.signal,
      });

      // Inline reset: avoids needing resetWorkState in the effect deps,
      // which would re-bind window listeners on every render.
      stageRef.current = "idle";
      setStage("idle");
      abortRef.current = null;
      callIdRef.current = null;

      if (!result.ok && result.cancelled) return;
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Call transcribed");
      router.push(`/leads/${leadId}/calls/${result.callId}`);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [leadId, router]);

  const showOverlay = dragging || stage !== "idle";

  return (
    <>
      {children}
      {showOverlay && (
        <div
          className="bg-background/85 fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
          aria-hidden={stage === "idle"}
        >
          <div className="border-primary bg-card flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center shadow-lg">
            {stage === "idle" ? (
              <>
                <Upload className="text-primary h-8 w-8" />
                <p className="text-base font-medium">Drop audio file to upload</p>
                <p className="text-muted-foreground text-xs">
                  mp3, mp4, m4a, opus, ogg, wav, flac, webm - up to 100 MB
                </p>
              </>
            ) : (
              <>
                <Loader2 className="text-primary h-6 w-6 animate-spin" />
                <p className="text-base font-medium">
                  {stage === "uploading" ? "Uploading…" : "Transcribing…"}
                </p>
                <p className="text-muted-foreground font-mono text-[10px]">
                  {stage === "uploading"
                    ? "transferring to secure storage"
                    : "whisper large v3 via groq"}
                </p>
                <Button variant="outline" size="sm" className="mt-2" onClick={onCancel}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

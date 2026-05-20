"use client";

import { Loader2, Mic, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { uploadCallFile, type UploadStage } from "@/lib/calls/upload-call-file";
import { ALLOWED_AUDIO_MIME } from "@/lib/storage/audio";
import { cn } from "@/lib/utils";

export function UploadCallDialog({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const reset = () => setStage("idle");

  const handleFile = async (file: File) => {
    const result = await uploadCallFile(file, leadId, setStage);
    if (!result.ok) {
      toast.error(result.error);
      reset();
      return;
    }
    toast.success("Call transcribed");
    setOpen(false);
    reset();
    router.push(`/leads/${leadId}/calls/${result.callId}`);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (stage !== "idle") return;
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const closable = stage === "idle";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !closable) return;
        if (!next) reset();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Mic className="h-3.5 w-3.5" />
          Upload call
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a call recording</DialogTitle>
          <DialogDescription>
            We&apos;ll transcribe it with Whisper Large v3. ~10s for a 30-minute call.
          </DialogDescription>
        </DialogHeader>

        {stage === "idle" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-border relative cursor-pointer rounded-lg border-2 border-dashed p-10 transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "hover:border-foreground/30 hover:bg-muted/30",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_AUDIO_MIME.join(",")}
              className="sr-only"
              onChange={onInputChange}
            />
            <div className="flex flex-col items-center gap-2 text-center">
              <Upload className="text-muted-foreground h-6 w-6" />
              <p className="text-sm font-medium">Drop audio file here</p>
              <p className="text-muted-foreground text-xs">
                mp3, mp4, m4a, opus, ogg, wav, flac, aac, webm - up to 100 MB
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-muted/30 border-border flex flex-col items-center gap-3 rounded-lg border py-10">
            <Loader2 className="text-primary h-5 w-5 animate-spin" />
            <p className="text-sm font-medium">
              {stage === "uploading" ? "Uploading…" : "Transcribing…"}
            </p>
            <p className="text-muted-foreground font-mono text-[10px]">
              {stage === "uploading"
                ? "transferring to secure storage"
                : "whisper large v3 via groq"}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

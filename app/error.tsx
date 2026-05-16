"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertCircle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="grid min-h-screen w-full place-items-center px-6">
      <div className="bg-card border-border max-w-md space-y-4 rounded-lg border p-6 text-center">
        <div className="bg-destructive/10 mx-auto flex h-10 w-10 items-center justify-center rounded-full">
          <AlertCircle className="text-destructive h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            The error has been reported. You can retry this page, or head back to your dashboard.
          </p>
        </div>
        {error.digest && (
          <p className="text-muted-foreground font-mono text-[10px]">id: {error.digest}</p>
        )}
        <Button onClick={reset} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    </div>
  );
}

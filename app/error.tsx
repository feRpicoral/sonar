"use client";

import * as Sentry from "@sentry/nextjs";
import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
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
    <div className="bg-background grid min-h-screen w-full place-items-center px-6">
      <div className="bg-card border-border shadow-panel max-w-md space-y-4 rounded-xl border p-6 text-center">
        <span className="bg-rose-bg text-rose-fg mx-auto inline-flex size-11 items-center justify-center rounded-xl">
          <TriangleAlert className="size-5" />
        </span>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            The error has been reported. You can retry this page, or head back to your dashboard.
          </p>
        </div>
        {error.digest && (
          <p className="text-muted-foreground border-border bg-muted inline-block rounded-md border px-2 py-0.5 font-mono text-[10px]">
            id: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-2">
          <Button onClick={reset}>
            <RotateCcw /> Retry
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

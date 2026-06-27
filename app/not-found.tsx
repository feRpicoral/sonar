import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-background grid min-h-screen w-full place-items-center px-6">
      <div className="max-w-md text-center">
        <span className="bg-muted text-muted-foreground mb-4 inline-flex size-12 items-center justify-center rounded-xl">
          <FileQuestion className="size-6" />
        </span>
        <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">404</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft />
              Back to dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

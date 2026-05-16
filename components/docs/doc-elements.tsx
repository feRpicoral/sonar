import type React from "react";

import { cn } from "@/lib/utils";

export function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-3 text-3xl font-semibold tracking-tight">{children}</h1>;
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-border mt-10 mb-3 border-b pb-2 text-xl font-semibold tracking-tight">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 mb-2 text-base font-semibold tracking-tight">{children}</h3>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground my-3 leading-relaxed">{children}</p>;
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>;
}

export function CodeBlock({ children, language }: { children: string; language?: string }) {
  return (
    <pre className="bg-card border-border my-4 overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-relaxed">
      {language && (
        <div className="text-muted-foreground mb-2 font-mono text-[10px] tracking-wide uppercase">
          {language}
        </div>
      )}
      <code className={cn("whitespace-pre")}>{children}</code>
    </pre>
  );
}

export function Lead({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground my-4 text-lg leading-relaxed">{children}</p>;
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border-border my-4 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-border bg-muted/40 text-muted-foreground border-b px-4 py-2 text-left text-xs font-medium tracking-wide uppercase">
      {children}
    </th>
  );
}

export function Td({ children }: { children: React.ReactNode }) {
  return <td className="border-border border-b px-4 py-2 align-top last:border-b-0">{children}</td>;
}

export function Callout({
  variant = "info",
  children,
}: {
  variant?: "info" | "warning";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "my-4 rounded-lg border px-4 py-3 text-sm",
        variant === "info" && "border-primary/30 bg-primary/5",
        variant === "warning" && "border-warning/30 bg-warning/5",
      )}
    >
      {children}
    </div>
  );
}

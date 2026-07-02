"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CodeBlock({ children, language }: { children: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="bg-card border-border my-4 overflow-hidden rounded-lg border">
      <div className="border-border-2 flex items-center justify-between border-b px-3 py-1.5">
        <span className="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">
          {language ?? "code"}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] transition-colors"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
        <code className="whitespace-pre">{children}</code>
      </pre>
    </div>
  );
}

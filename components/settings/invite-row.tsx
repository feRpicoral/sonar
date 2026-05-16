"use client";

import { Check, Copy, MailQuestion } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface InviteRowProps {
  email: string | null;
  role: "ADMIN" | "MEMBER";
  url: string;
  expiresAt: Date;
}

function relativeDays(target: Date): string {
  const ms = target.getTime() - Date.now();
  const days = Math.round(ms / 86_400_000);
  if (days <= 0) return "expired";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

export function InviteRow({ email, role, url, expiresAt }: InviteRowProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border-border flex items-center justify-between border-b py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
          <MailQuestion className="text-muted-foreground h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{email ?? "Anyone with link"}</div>
          <div className="text-muted-foreground text-xs">Expires {relativeDays(expiresAt)}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="font-mono text-[10px]">
          {role.toLowerCase()}
        </Badge>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onCopy}>
          {copied ? (
            <Check className="text-success h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}

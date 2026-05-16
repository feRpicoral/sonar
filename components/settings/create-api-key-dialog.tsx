"use client";

import { Check, Copy, Key, KeyRound } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createApiKeyAction } from "@/lib/api-keys/actions";
import { SCOPE_LABELS, VALID_SCOPES } from "@/lib/api-keys/crypto";

export function CreateApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["leads:read", "runs:read"]);
  const [generated, setGenerated] = useState<{ plaintext: string; last4: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const toggleScope = (s: string) => {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const onSubmit = () => {
    startTransition(async () => {
      const result = await createApiKeyAction({ name, scopes });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setGenerated({ plaintext: result.plaintext, last4: result.last4 });
    });
  };

  const onCopy = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated.plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setGenerated(null);
      setName("");
      setScopes(["leads:read", "runs:read"]);
      setCopied(false);
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Key className="h-3.5 w-3.5" />
          Create API key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {generated ? (
          <>
            <DialogHeader>
              <DialogTitle>API key created</DialogTitle>
              <DialogDescription>
                Copy it now - this is the only time you&apos;ll see the full key. Store it like a
                password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Alert>
                <KeyRound className="h-4 w-4" />
                <AlertDescription className="font-mono text-xs break-all">
                  {generated.plaintext}
                </AlertDescription>
              </Alert>
              <Button onClick={onCopy} variant="outline" className="w-full gap-1.5">
                {copied ? (
                  <>
                    <Check className="text-success h-3.5 w-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy to clipboard
                  </>
                )}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                For programmatic access to your workspace. Scope to the minimum your integration
                needs.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key-name">Name</Label>
                <Input
                  id="api-key-name"
                  placeholder="e.g. 'Slack bot' or 'staging integration'"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Scopes</Label>
                <div className="border-border bg-card space-y-1.5 rounded-md border p-3">
                  {VALID_SCOPES.map((scope) => (
                    <label
                      key={scope}
                      className="hover:bg-muted/30 flex cursor-pointer items-start gap-3 rounded-md p-1.5 transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="border-input text-primary focus-visible:ring-ring mt-0.5 h-3.5 w-3.5 cursor-pointer rounded border"
                        checked={scopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                      />
                      <div className="space-y-0.5">
                        <div className="font-mono text-xs">{scope}</div>
                        <div className="text-muted-foreground text-xs">{SCOPE_LABELS[scope]}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={onSubmit}
                disabled={isPending || !name.trim() || scopes.length === 0}
              >
                {isPending ? "Generating…" : "Create key"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

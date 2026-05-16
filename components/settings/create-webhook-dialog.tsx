"use client";

import { Check, Copy, Webhook } from "lucide-react";
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
import { createWebhookAction } from "@/lib/webhooks/actions";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";

export function CreateWebhookDialog() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<string[]>(["lead.created", "run.completed"]);
  const [generated, setGenerated] = useState<{ secret: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const toggleEvent = (e: string) => {
    setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  };

  const onSubmit = () => {
    startTransition(async () => {
      const result = await createWebhookAction({ url, description, events });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setGenerated({ secret: result.secret });
    });
  };

  const onCopy = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setGenerated(null);
      setUrl("");
      setDescription("");
      setEvents(["lead.created", "run.completed"]);
      setCopied(false);
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Webhook className="h-3.5 w-3.5" />
          Add webhook
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {generated ? (
          <>
            <DialogHeader>
              <DialogTitle>Webhook created</DialogTitle>
              <DialogDescription>
                Copy the signing secret now — this is the only time it will be shown. Your endpoint
                uses it to verify the <code className="font-mono text-xs">X-Sonar-Signature</code>{" "}
                header.
              </DialogDescription>
            </DialogHeader>
            <Alert>
              <AlertDescription className="font-mono text-xs break-all">
                {generated.secret}
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
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add webhook</DialogTitle>
              <DialogDescription>
                We&apos;ll POST signed JSON to your endpoint when subscribed events fire.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Endpoint URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://your-app.com/webhooks/sonar"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-desc">Description (optional)</Label>
                <Input
                  id="webhook-desc"
                  placeholder="e.g. 'Slack alert for new leads'"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Events</Label>
                <div className="border-border bg-card space-y-1.5 rounded-md border p-3">
                  {WEBHOOK_EVENTS.map((e) => (
                    <label
                      key={e}
                      className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 rounded-md p-1.5 transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="border-input text-primary focus-visible:ring-ring h-3.5 w-3.5 cursor-pointer rounded border"
                        checked={events.includes(e)}
                        onChange={() => toggleEvent(e)}
                      />
                      <span className="font-mono text-xs">{e}</span>
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
              <Button onClick={onSubmit} disabled={isPending || !url.trim() || events.length === 0}>
                {isPending ? "Creating…" : "Create webhook"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

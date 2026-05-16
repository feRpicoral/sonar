"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  Repeat,
  Trash2,
  Webhook,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  deleteWebhookAction,
  replayDeliveryAction,
  rotateWebhookSecretAction,
  setWebhookActiveAction,
} from "@/lib/webhooks/actions";

export interface DeliveryItem {
  id: string;
  eventType: string;
  status: "PENDING" | "DELIVERED" | "FAILED" | "DEAD_LETTER";
  responseStatus: number | null;
  createdAt: Date;
}

export interface WebhookRowProps {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  active: boolean;
  createdAt: Date;
  deliveries: DeliveryItem[];
}

export function WebhookRow(props: WebhookRowProps) {
  const { id, url, description, events, active, createdAt, deliveries } = props;
  const [expanded, setExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onToggle = () => {
    startTransition(async () => {
      const result = await setWebhookActiveAction(id, !active);
      if (result.error) toast.error(result.error);
      else toast.success(active ? "Webhook paused" : "Webhook activated");
    });
  };

  const onRotate = () => {
    startTransition(async () => {
      const result = await rotateWebhookSecretAction(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.secret) {
        await navigator.clipboard.writeText(result.secret).catch(() => {});
        toast.success("New secret copied to clipboard");
      }
    });
  };

  const onDelete = () => {
    startTransition(async () => {
      const result = await deleteWebhookAction(id);
      if (result.error) toast.error(result.error);
      else toast.success("Webhook deleted");
      setDeleteOpen(false);
    });
  };

  const onReplay = (deliveryId: string) => {
    startTransition(async () => {
      const result = await replayDeliveryAction(deliveryId);
      if (result.error) toast.error(result.error);
      else toast.success("Replay queued");
    });
  };

  return (
    <>
      <div className="border-border border-b last:border-b-0">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3">
          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-md">
            <Webhook className="text-muted-foreground h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-mono text-xs">{url}</span>
              <Badge variant={active ? "default" : "secondary"} className="font-mono text-[10px]">
                {active ? "active" : "paused"}
              </Badge>
            </div>
            {description && <p className="text-muted-foreground truncate text-xs">{description}</p>}
            <div className="flex flex-wrap gap-1">
              {events.map((e) => (
                <Badge key={e} variant="outline" className="font-mono text-[9px]">
                  {e}
                </Badge>
              ))}
            </div>
            <p className="text-muted-foreground font-mono text-[10px]">
              created {formatDistanceToNow(createdAt, { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setExpanded((v) => !v)}
              disabled={isPending}
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              Deliveries ({deliveries.length})
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isPending}>
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem className="gap-2" onClick={onToggle}>
                  {active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {active ? "Pause" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={onRotate}>
                  <RefreshCw className="h-4 w-4" /> Rotate secret
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive gap-2"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {expanded && (
          <div className="bg-muted/20 border-border border-t px-4 py-3">
            {deliveries.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-xs">
                No deliveries yet - they show up here once events fire.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {deliveries.map((d) => (
                  <li
                    key={d.id}
                    className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-2"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        d.status === "DELIVERED" && "bg-success",
                        d.status === "FAILED" && "bg-destructive",
                        d.status === "PENDING" && "bg-warning",
                        d.status === "DEAD_LETTER" && "bg-destructive",
                      )}
                    />
                    <div className="min-w-0">
                      <div className="font-mono text-xs">{d.eventType}</div>
                      <div className="text-muted-foreground font-mono text-[10px]">
                        {formatDistanceToNow(d.createdAt, { addSuffix: true })}
                        {d.responseStatus != null && ` , http ${d.responseStatus}`}
                      </div>
                    </div>
                    <Badge
                      variant={
                        d.status === "DELIVERED"
                          ? "default"
                          : d.status === "FAILED" || d.status === "DEAD_LETTER"
                            ? "destructive"
                            : "secondary"
                      }
                      className="font-mono text-[9px]"
                    >
                      {d.status.toLowerCase()}
                    </Badge>
                    {(d.status === "FAILED" || d.status === "DEAD_LETTER") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 px-2"
                        onClick={() => onReplay(d.id)}
                        disabled={isPending}
                      >
                        <Repeat className="h-3 w-3" /> Replay
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              Your endpoint stops receiving deliveries immediately. Past deliveries are kept for
              audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

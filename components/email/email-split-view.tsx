"use client";

import { ArrowLeft, Edit2, Pencil, Send, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { type RefCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import {
  approveAndSendEmailAction,
  regenerateEmailAction,
  updateEmailDraftAction,
} from "@/lib/email/actions";
import { formatTimestamp } from "@/lib/transcription/whisper";
import { cn } from "@/lib/utils";

export interface Citation {
  phrase: string;
  transcriptSegmentIndex: number;
}

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface EmailSplitViewProps {
  draftId: string;
  subject: string;
  body: string;
  citations: Citation[];
  segments: Segment[];
  status: string;
  leadId: string;
  leadName: string;
  recipient: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  SENT: "Sent",
  FAILED: "Failed",
};

export function EmailSplitView(props: EmailSplitViewProps) {
  const { draftId, subject, body, citations, segments, status, leadId, leadName, recipient } =
    props;

  const sent = status === "SENT";
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState(subject);
  const [editedBody, setEditedBody] = useState(body);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [regenOpen, setRegenOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const segmentRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const setSegmentRef =
    (i: number): RefCallback<HTMLLIElement> =>
    (el) => {
      if (el) segmentRefs.current.set(i, el);
      else segmentRefs.current.delete(i);
    };

  // Scroll the highlighted segment into view as a side effect. The state
  // setter goes straight to renderBodyWithCitations so the rendering path
  // doesn't read any refs during render.
  useEffect(() => {
    if (highlight === null) return;
    const el = segmentRefs.current.get(highlight);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight]);

  const annotatedBody = renderBodyWithCitations(body, citations, setHighlight);

  const onSaveEdit = () => {
    startTransition(async () => {
      const result = await updateEmailDraftAction(draftId, editedSubject, editedBody);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Draft updated");
        setIsEditing(false);
      }
    });
  };

  const onCancelEdit = () => {
    setEditedSubject(subject);
    setEditedBody(body);
    setIsEditing(false);
  };

  const onApprove = () => {
    startTransition(async () => {
      const result = await approveAndSendEmailAction(draftId);
      if (result.error) toast.error(result.error);
      else toast.success("Email sent");
    });
  };

  const onRegenerate = () => {
    if (!feedback.trim()) {
      toast.error("Feedback is required");
      return;
    }
    startTransition(async () => {
      const result = await regenerateEmailAction(draftId, feedback);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Regenerated with feedback");
        setFeedback("");
        setRegenOpen(false);
      }
    });
  };

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <header className="border-border flex flex-col gap-3 border-b px-4 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <Link
            href={`/leads/${leadId}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to {leadName}
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Approve email</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={sent ? "default" : status === "FAILED" ? "destructive" : "secondary"}
            className="font-mono text-[10px]"
          >
            {STATUS_LABELS[status] ?? status.toLowerCase()}
          </Badge>
          {!sent && !isEditing && (
            <>
              <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={isPending}>
                    <Sparkles className="h-3.5 w-3.5" /> Regenerate
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Regenerate with feedback</DialogTitle>
                    <DialogDescription>
                      The writer agent will re-draft using research / analysis / strategy from the
                      prior run, plus your feedback.
                    </DialogDescription>
                  </DialogHeader>
                  <textarea
                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[120px] w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none"
                    placeholder="e.g. 'Too formal. Make the opener about their hiring spree.'"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFeedback("");
                        setRegenOpen(false);
                      }}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button onClick={onRegenerate} disabled={isPending} className="gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      {isPending ? "Generating…" : "Regenerate"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setIsEditing(true)}
                disabled={isPending}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={onApprove}
                disabled={isPending || !recipient}
                title={!recipient ? "Add an email to the lead first" : undefined}
              >
                <Send className="h-3.5 w-3.5" />
                {isPending ? "Sending…" : "Approve & send"}
              </Button>
            </>
          )}
          {isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={onCancelEdit}
                disabled={isPending}
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button size="sm" onClick={onSaveEdit} disabled={isPending} className="gap-1.5">
                <Edit2 className="h-3.5 w-3.5" />
                {isPending ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-2 lg:overflow-hidden">
        <section className="border-border border-b px-4 py-6 sm:px-8 lg:overflow-y-auto lg:border-r lg:border-b-0">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="text-muted-foreground space-y-1 text-xs">
              <div>
                <span className="text-muted-foreground/70 font-mono uppercase">To</span>{" "}
                {recipient ? (
                  <span className="text-foreground">{recipient}</span>
                ) : (
                  <Link href={`/leads/${leadId}`} className="text-destructive hover:underline">
                    No email on file - add one to the lead
                  </Link>
                )}
              </div>
              <div>
                <span className="text-muted-foreground/70 font-mono uppercase">From</span>{" "}
                <span>onboarding@resend.dev</span>
              </div>
            </div>
            {isEditing ? (
              <>
                <Input
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  placeholder="Subject"
                  className="text-base font-medium"
                />
                <textarea
                  className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[320px] w-full rounded-md border px-3 py-3 text-sm leading-relaxed shadow-xs focus-visible:ring-1 focus-visible:outline-none"
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                />
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold">{subject}</h2>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{annotatedBody}</div>
              </>
            )}
          </div>
        </section>

        <section className="px-4 py-6 sm:px-8 lg:overflow-y-auto">
          <div className="mx-auto max-w-2xl">
            <header className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium">Source transcript</h2>
              <span className="text-muted-foreground font-mono text-[10px]">
                {segments.length} {segments.length === 1 ? "segment" : "segments"}
              </span>
            </header>
            {segments.length === 0 ? (
              <p className="text-muted-foreground bg-muted/30 border-border rounded-lg border border-dashed px-4 py-12 text-center text-sm">
                No call attached to this run.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {segments.map((seg, i) => (
                  <li
                    key={i}
                    ref={setSegmentRef(i)}
                    className={cn(
                      "flex gap-3 rounded-md px-3 py-2 transition-colors",
                      highlight === i
                        ? "bg-primary/10 ring-primary/30 ring-1"
                        : "hover:bg-muted/30",
                    )}
                  >
                    <span className="text-muted-foreground w-12 shrink-0 font-mono text-xs tabular-nums">
                      {formatTimestamp(seg.start)}
                    </span>
                    <p className="text-sm leading-relaxed">{seg.text.trim()}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function renderBodyWithCitations(
  body: string,
  citations: Citation[],
  onHighlight: (i: number | null) => void,
): React.ReactNode {
  if (citations.length === 0) return body;

  // Build non-overlapping ranges by first match for each citation.
  const ranges: Array<{ start: number; end: number; segIdx: number }> = [];
  for (const c of citations) {
    const start = body.indexOf(c.phrase);
    if (start === -1) continue;
    // Skip if it overlaps an existing range (same phrase, etc.).
    if (ranges.some((r) => start < r.end && start + c.phrase.length > r.start)) continue;
    ranges.push({ start, end: start + c.phrase.length, segIdx: c.transcriptSegmentIndex });
  }
  ranges.sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((r, i) => {
    if (r.start > cursor) parts.push(body.slice(cursor, r.start));
    parts.push(
      <mark
        key={`c-${i}`}
        className="bg-primary/10 hover:bg-primary/20 -mx-0.5 cursor-pointer rounded-sm px-0.5 transition-colors"
        onMouseEnter={() => onHighlight(r.segIdx)}
        onMouseLeave={() => onHighlight(null)}
        onClick={() => onHighlight(r.segIdx)}
      >
        {body.slice(r.start, r.end)}
      </mark>,
    );
    cursor = r.end;
  });
  if (cursor < body.length) parts.push(body.slice(cursor));
  return parts;
}

"use client";

import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Pencil,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { type RefCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CiteChip, CitedBadge } from "@/components/ui/cite-chip";
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
import { StatusPill } from "@/components/ui/status-pill";
import {
  approveAndSendEmailAction,
  regenerateEmailAction,
  updateEmailDraftAction,
} from "@/lib/email/actions";
import { emailDeliveryStatusMeta, emailDraftStatusMeta } from "@/lib/status";
import { speakerLabel, type TranscriptSegment } from "@/lib/transcription/speakers";
import { formatTimestamp } from "@/lib/transcription/whisper";
import { cn } from "@/lib/utils";

export interface Citation {
  phrase: string;
  transcriptSegmentIndex: number;
}

export interface EmailSplitViewProps {
  draftId: string;
  subject: string;
  body: string;
  citations: Citation[];
  segments: TranscriptSegment[];
  status: string;
  leadId: string;
  leadName: string;
  recipient: string | null;
  failureReason: string | null;
  delivery: {
    status: string;
    recipientEmail: string | null;
    failureReason: string | null;
    failureCode: string | null;
  } | null;
}

interface ResolvedCitation extends Citation {
  number: number;
  matches: number[];
}

export function EmailSplitView(props: EmailSplitViewProps) {
  const {
    draftId,
    subject,
    body,
    citations,
    segments,
    status,
    leadId,
    leadName,
    recipient,
    failureReason,
    delivery,
  } = props;

  const sent = status === "SENT";
  const failed = status === "FAILED";
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState(subject);
  const [editedBody, setEditedBody] = useState(body);
  const [active, setActive] = useState<{ ci: number; pos: number } | null>(null);
  const [regenOpen, setRegenOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const resolved = useMemo<ResolvedCitation[]>(
    () =>
      citations.map((c, i) => {
        const matches = segments
          .map((s, idx) => (s.text.toLowerCase().includes(c.phrase.toLowerCase()) ? idx : -1))
          .filter((idx) => idx !== -1);
        if (!matches.includes(c.transcriptSegmentIndex) && segments[c.transcriptSegmentIndex]) {
          matches.unshift(c.transcriptSegmentIndex);
        }
        return {
          ...c,
          number: i + 1,
          matches: matches.length ? matches : [c.transcriptSegmentIndex],
        };
      }),
    [citations, segments],
  );

  const activeCitation = active ? resolved[active.ci] : null;
  const activeSegment = active && activeCitation ? activeCitation.matches[active.pos] : null;

  const segmentRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const setSegmentRef =
    (i: number): RefCallback<HTMLLIElement> =>
    (el) => {
      if (el) segmentRefs.current.set(i, el);
      else segmentRefs.current.delete(i);
    };

  useEffect(() => {
    if (activeSegment == null) return;
    segmentRefs.current.get(activeSegment)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeSegment]);

  const citedSegments = useMemo(() => {
    const map = new Map<number, number>();
    for (const c of resolved) for (const m of c.matches) if (!map.has(m)) map.set(m, c.number);
    return map;
  }, [resolved]);

  // Seed the editor from the current draft each time it opens. `editedSubject` /
  // `editedBody` are initialized once at mount, so without this a regenerate
  // (which updates the subject/body props via revalidation) would leave the
  // editor holding stale text and saving would overwrite the new draft.
  const onStartEdit = () => {
    setEditedSubject(subject);
    setEditedBody(body);
    setIsEditing(true);
  };

  const onSaveEdit = () =>
    startTransition(async () => {
      const result = await updateEmailDraftAction(draftId, editedSubject, editedBody);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Draft updated");
        setIsEditing(false);
      }
    });

  const onApprove = () =>
    startTransition(async () => {
      const result = await approveAndSendEmailAction(draftId);
      if (result.error) toast.error(result.error);
      else toast.success("Email sent");
    });

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

  const transcriptText = () =>
    segments
      .map((s) => `[${formatTimestamp(s.start)}] ${speakerLabel(s.speaker)}: ${s.text.trim()}`)
      .join("\n");

  const copyTranscript = () => {
    navigator.clipboard.writeText(transcriptText()).then(
      () => toast.success("Transcript copied"),
      () => toast.error("Copy failed"),
    );
  };

  const downloadTranscript = () => {
    const blob = new Blob([transcriptText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${leadName.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-full flex-col lg:h-screen">
      <header className="bg-background flex flex-col gap-3 border-b px-6 py-3 lg:h-14 lg:flex-row lg:items-center lg:justify-between lg:py-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/leads/${leadId}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px] transition-colors"
          >
            <ArrowLeft className="size-3.5" /> {leadName}
          </Link>
          <span className="text-sm font-semibold">Approve email</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill
            descriptor={emailDraftStatusMeta[status as keyof typeof emailDraftStatusMeta]}
          />
          {!sent && !isEditing && (
            <>
              <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isPending}>
                    <Sparkles /> Regenerate
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Regenerate with feedback</DialogTitle>
                    <DialogDescription>
                      The writer re-drafts using research / analysis / strategy from the prior run,
                      plus your feedback.
                    </DialogDescription>
                  </DialogHeader>
                  <textarea
                    className="border-input bg-card placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring min-h-[120px] w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
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
                    <Button onClick={onRegenerate} disabled={isPending}>
                      <Sparkles />
                      {isPending ? "Generating…" : "Regenerate"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={onStartEdit} disabled={isPending}>
                <Pencil /> Edit
              </Button>
              <Button
                size="sm"
                onClick={onApprove}
                disabled={isPending || !recipient}
                title={!recipient ? "Add an email to the lead first" : undefined}
              >
                <Send />
                {isPending ? "Sending…" : failed ? "Retry send" : "Approve & send"}
              </Button>
            </>
          )}
          {isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditedSubject(subject);
                  setEditedBody(body);
                  setIsEditing(false);
                }}
                disabled={isPending}
              >
                <X /> Cancel
              </Button>
              <Button size="sm" onClick={onSaveEdit} disabled={isPending}>
                <Check />
                {isPending ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-2 lg:overflow-hidden">
        <section className="border-b px-6 py-6 lg:overflow-y-auto lg:border-r lg:border-b-0">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="text-muted-foreground space-y-1 text-xs">
              <div>
                <span className="text-muted-foreground/70 font-mono uppercase">To</span>{" "}
                {recipient ? (
                  <span className="text-foreground">
                    {leadName} · {recipient}
                  </span>
                ) : (
                  <Link href={`/leads/${leadId}`} className="text-rose-fg hover:underline">
                    No email on file. Add one to the lead
                  </Link>
                )}
              </div>
              <div>
                <span className="text-muted-foreground/70 font-mono uppercase">From</span>{" "}
                <span>onboarding@resend.dev</span>
              </div>
            </div>

            {sent && delivery && <DeliveryBanner delivery={delivery} />}
            {failed && (failureReason || delivery?.failureReason) && (
              <Callout variant="warning">
                <p className="font-semibold">Send failed</p>
                <p className="mt-0.5">{delivery?.failureReason ?? failureReason}</p>
              </Callout>
            )}

            {isEditing ? (
              <>
                <Input
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  placeholder="Subject"
                  className="text-base font-medium"
                />
                <textarea
                  className="border-input bg-card focus-visible:ring-ring/50 focus-visible:border-ring min-h-[320px] w-full rounded-lg border px-3 py-3 text-sm leading-relaxed outline-none focus-visible:ring-[3px]"
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                />
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold">{subject}</h2>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  <Body
                    body={body}
                    citations={resolved}
                    activeCi={active?.ci ?? null}
                    onActivate={(ci) => setActive({ ci, pos: 0 })}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        <section className="px-6 py-6 lg:overflow-y-auto">
          <div className="mx-auto max-w-2xl">
            <header className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Source transcript</h2>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-[10px]">
                  {segments.length} {segments.length === 1 ? "segment" : "segments"}
                </span>
                {segments.length > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={copyTranscript}
                      title="Copy transcript"
                    >
                      <Copy />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={downloadTranscript}
                      title="Download transcript"
                    >
                      <Download />
                    </Button>
                  </>
                )}
              </div>
            </header>

            {activeCitation && activeCitation.matches.length > 1 && (
              <div className="bg-muted border-border mb-3 flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs">
                <span>
                  Citation {activeCitation.number} · match {active!.pos + 1} of{" "}
                  {activeCitation.matches.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      setActive((a) =>
                        a
                          ? {
                              ci: a.ci,
                              pos:
                                (a.pos - 1 + activeCitation.matches.length) %
                                activeCitation.matches.length,
                            }
                          : a,
                      )
                    }
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      setActive((a) =>
                        a ? { ci: a.ci, pos: (a.pos + 1) % activeCitation.matches.length } : a,
                      )
                    }
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            )}

            {segments.length === 0 ? (
              <p className="text-muted-foreground bg-muted/30 border-border rounded-lg border border-dashed px-4 py-12 text-center text-sm">
                No call attached to this run.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {segments.map((seg, i) => {
                  const citedNumber = citedSegments.get(i);
                  return (
                    <li
                      key={i}
                      ref={setSegmentRef(i)}
                      className={cn(
                        "flex gap-3 rounded-md px-3 py-2 transition-colors",
                        activeSegment === i
                          ? "bg-primary/10 ring-primary/30 ring-1"
                          : "hover:bg-muted/40",
                      )}
                    >
                      <span className="text-muted-foreground w-12 shrink-0 pt-0.5 font-mono text-xs tabular-nums">
                        {formatTimestamp(seg.start)}
                      </span>
                      <p className="min-w-0 text-sm leading-relaxed">
                        <span
                          className={cn(
                            "mr-2 text-[11px] font-semibold",
                            seg.speaker === "rep" ? "text-violet-fg" : "text-emerald-fg",
                          )}
                        >
                          {speakerLabel(seg.speaker)}
                        </span>
                        {seg.text.trim()}
                        {citedNumber != null && (
                          <span className="ml-1.5 align-middle">
                            <CitedBadge active={activeSegment === i} count={citedNumber} />
                          </span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function DeliveryBanner({ delivery }: { delivery: NonNullable<EmailSplitViewProps["delivery"]> }) {
  const descriptor =
    emailDeliveryStatusMeta[delivery.status as keyof typeof emailDeliveryStatusMeta];
  return (
    <div className="border-border bg-card flex items-center gap-2.5 rounded-lg border px-3 py-2">
      {descriptor && <StatusPill descriptor={descriptor} />}
      <span className="text-muted-foreground text-[12.5px]">
        {delivery.recipientEmail ? `Recipient: ${delivery.recipientEmail}` : "Delivery recorded"}
      </span>
    </div>
  );
}

function Body({
  body,
  citations,
  activeCi,
  onActivate,
}: {
  body: string;
  citations: ResolvedCitation[];
  activeCi: number | null;
  onActivate: (ci: number) => void;
}) {
  if (citations.length === 0) return body;

  const ranges: Array<{ start: number; end: number; ci: number }> = [];
  citations.forEach((c, ci) => {
    const start = body.toLowerCase().indexOf(c.phrase.toLowerCase());
    if (start === -1) return;
    if (ranges.some((r) => start < r.end && start + c.phrase.length > r.start)) return;
    ranges.push({ start, end: start + c.phrase.length, ci });
  });
  ranges.sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((r, i) => {
    if (r.start > cursor) parts.push(body.slice(cursor, r.start));
    const cite = citations[r.ci]!;
    parts.push(
      <span key={`c-${i}`} className="whitespace-normal">
        <mark
          className={cn(
            "-mx-0.5 rounded-sm px-0.5",
            activeCi === r.ci ? "bg-primary/20" : "bg-primary/10",
          )}
        >
          {body.slice(r.start, r.end)}
        </mark>
        <span className="ml-0.5 align-middle">
          <CiteChip active={activeCi === r.ci} onClick={() => onActivate(r.ci)}>
            {cite.number}
          </CiteChip>
        </span>
      </span>,
    );
    cursor = r.end;
  });
  if (cursor < body.length) parts.push(body.slice(cursor));
  return parts;
}

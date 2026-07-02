"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { speakerLabel, type TranscriptSegment } from "@/lib/transcription/speakers";
import { formatTimestamp } from "@/lib/transcription/whisper";
import { cn } from "@/lib/utils";

function highlight(text: string, query: string) {
  if (!query) return text;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let idx = lower.indexOf(query, cursor);
  while (idx !== -1) {
    if (idx > cursor) parts.push(text.slice(cursor, idx));
    parts.push(
      <mark key={idx} className="bg-amber-bg text-amber-fg rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>,
    );
    cursor = idx + query.length;
    idx = lower.indexOf(query, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export function TranscriptViewer({ segments }: { segments: TranscriptSegment[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = useMemo(
    () => (query ? segments.filter((s) => s.text.toLowerCase().includes(query)) : segments),
    [segments, query],
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find in transcript"
          className="border-input bg-card focus-visible:ring-ring/50 focus-visible:border-ring h-9 w-full rounded-lg border pr-3 pl-9 text-sm outline-none focus-visible:ring-[3px]"
        />
      </div>
      <ul className="space-y-0.5">
        {filtered.map((seg, i) => (
          <li
            key={i}
            className="hover:bg-muted/40 flex gap-3 rounded-md px-3 py-2 transition-colors"
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
              {highlight(seg.text.trim(), query)}
            </p>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-muted-foreground px-3 py-10 text-center text-sm">
            No segments match &ldquo;{q}&rdquo;.
          </li>
        )}
      </ul>
    </div>
  );
}

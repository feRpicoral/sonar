import { formatTimestamp } from "@/lib/transcription/whisper";

interface Segment {
  start: number;
  end: number;
  text: string;
}

export function TranscriptViewer({ segments }: { segments: Segment[] }) {
  if (segments.length === 0) {
    return (
      <div className="bg-card border-border grid place-items-center rounded-lg border border-dashed py-16">
        <p className="text-muted-foreground font-mono text-xs">No transcript segments</p>
      </div>
    );
  }

  return (
    <div className="bg-card border-border overflow-hidden rounded-lg border">
      <ul className="divide-border divide-y">
        {segments.map((seg, i) => (
          <li key={i} className="flex gap-4 px-4 py-2.5">
            <span className="text-muted-foreground w-14 shrink-0 font-mono text-xs tabular-nums">
              {formatTimestamp(seg.start)}
            </span>
            <p className="text-sm leading-relaxed">{seg.text.trim()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

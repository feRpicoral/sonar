export type SpeakerRole = "rep" | "lead";

export interface RawSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptSegment extends RawSegment {
  speaker: SpeakerRole;
}

// Groq Whisper (segment granularity) does not diarize, so we infer a two-party
// turn structure: the conversation opens with the rep, and the speaker flips on
// any pause longer than this between consecutive segments.
const SPEAKER_PAUSE_SEC = 0.75;

export function assignSpeakers(segments: RawSegment[]): TranscriptSegment[] {
  let current: SpeakerRole = "rep";
  let prevEnd: number | null = null;
  return segments.map((s) => {
    if (prevEnd !== null && s.start - prevEnd > SPEAKER_PAUSE_SEC) {
      current = current === "rep" ? "lead" : "rep";
    }
    prevEnd = s.end;
    return { start: s.start, end: s.end, text: s.text, speaker: current };
  });
}

export function speakerLabel(speaker: SpeakerRole, leadName: string): string {
  return speaker === "rep" ? "You" : leadName;
}

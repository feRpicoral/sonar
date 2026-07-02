export type SpeakerRole = "rep" | "lead";

export interface RawSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptSegment extends RawSegment {
  speaker: SpeakerRole;
}

// Groq Whisper does not diarize. These are neutral visual group labels inferred
// from pauses, not speaker identities.
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

export function speakerLabel(speaker: SpeakerRole): string {
  return speaker === "rep" ? "Speaker A" : "Speaker B";
}

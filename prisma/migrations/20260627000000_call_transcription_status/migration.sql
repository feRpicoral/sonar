-- CreateEnum
CREATE TYPE "TranscriptionStatus" AS ENUM ('QUEUED', 'TRANSCRIBING', 'DONE', 'NO_SPEECH', 'FAILED');

-- AlterTable
ALTER TABLE "calls" ADD COLUMN     "transcription_status" "TranscriptionStatus" NOT NULL DEFAULT 'QUEUED';

-- Backfill: existing calls with a transcript are already done.
UPDATE "calls" SET "transcription_status" = 'DONE' WHERE "transcript_text" IS NOT NULL;

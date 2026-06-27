-- AlterTable
ALTER TABLE "email_drafts" ADD COLUMN     "failure_reason" TEXT;

-- AlterTable
ALTER TABLE "email_deliveries" ADD COLUMN     "failure_code" TEXT,
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "recipient_email" TEXT;

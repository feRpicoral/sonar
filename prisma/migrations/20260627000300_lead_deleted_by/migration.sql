-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "deleted_by_user_id" UUID;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

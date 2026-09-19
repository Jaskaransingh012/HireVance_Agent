-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_opportunityId_fkey";

-- DropIndex
DROP INDEX "Notification_opportunityId_channel_type_key";

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "channel" SET DEFAULT 'whatsapp';

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

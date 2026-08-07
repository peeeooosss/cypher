-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "categoryCount" INTEGER,
ADD COLUMN     "commissionDue" INTEGER,
ADD COLUMN     "commissionPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "commissionPaidAt" TIMESTAMP(3),
ADD COLUMN     "flatFee" INTEGER,
ADD COLUMN     "flatFeePaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flatFeePaidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Gig" ADD COLUMN     "feePaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feePaidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gigWorkEnabledAt" TIMESTAMP(3),
ADD COLUMN     "gigWorkExpiresAt" TIMESTAMP(3);

-- Backfill: gigs posted before pay-to-post stay live.
UPDATE "Gig" SET "feePaid" = true;

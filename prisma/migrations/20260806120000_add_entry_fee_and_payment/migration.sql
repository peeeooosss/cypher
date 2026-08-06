-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "entryCurrency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "entryFee" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "entryCurrency" TEXT,
ADD COLUMN     "entryFee" INTEGER,
ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidAt" TIMESTAMP(3);

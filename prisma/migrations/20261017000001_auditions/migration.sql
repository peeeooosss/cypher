-- CreateEnum
CREATE TYPE "AuditionMode" AS ENUM ('OFFLINE', 'ONLINE');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "auditionsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Audition" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "mode" "AuditionMode" NOT NULL,
    "city" TEXT,
    "categoryId" TEXT,
    "details" TEXT,
    "announcementText" TEXT,
    "whatsappNumber" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Audition_eventId_displayOrder_idx" ON "Audition"("eventId", "displayOrder");

-- AddForeignKey
ALTER TABLE "Audition" ADD CONSTRAINT "Audition_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Audition" ADD CONSTRAINT "Audition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

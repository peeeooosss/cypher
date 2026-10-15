-- CreateEnum
CREATE TYPE "GalleryItemType" AS ENUM ('PHOTO', 'VIDEO');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "showPublicLeaderboard" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "JudgeSlot" ADD COLUMN "eventJudgeId" TEXT;

-- CreateTable
CREATE TABLE "EventJudge" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "photoFileKey" TEXT,
    "socialLinks" JSONB,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventJudge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "caption" TEXT,
    "type" "GalleryItemType" NOT NULL,
    "url" TEXT NOT NULL,
    "fileKey" TEXT,
    "thumbnailUrl" TEXT,
    "sourceLink" TEXT,
    "eventId" TEXT,
    "isFeaturedHomepage" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventJudge_eventId_displayOrder_idx" ON "EventJudge"("eventId", "displayOrder");
CREATE INDEX "GalleryItem_isPublished_displayOrder_idx" ON "GalleryItem"("isPublished", "displayOrder");
CREATE INDEX "GalleryItem_eventId_idx" ON "GalleryItem"("eventId");

-- AddForeignKey
ALTER TABLE "EventJudge" ADD CONSTRAINT "EventJudge_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JudgeSlot" ADD CONSTRAINT "JudgeSlot_eventJudgeId_fkey" FOREIGN KEY ("eventJudgeId") REFERENCES "EventJudge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

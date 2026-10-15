-- CreateTable
CREATE TABLE "EventPhoto" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "caption" TEXT,
    "photoUrl" TEXT NOT NULL,
    "photoFileKey" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventPhoto_eventId_displayOrder_idx" ON "EventPhoto"("eventId", "displayOrder");

-- AddForeignKey
ALTER TABLE "EventPhoto" ADD CONSTRAINT "EventPhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

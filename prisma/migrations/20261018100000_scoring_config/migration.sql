-- CreateEnum
CREATE TYPE "ScoringAppliesTo" AS ENUM ('EVENT_TYPE', 'ROUND_TYPE', 'EVENT', 'CATEGORY', 'ROUND_FORMAT');

-- CreateTable
CREATE TABLE "ScoringConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "appliesTo" "ScoringAppliesTo" NOT NULL,
    "appliesToValue" TEXT,
    "criteria" JSONB NOT NULL,
    "totalMax" INTEGER NOT NULL DEFAULT 20,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoringConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScoringConfig_name_key" ON "ScoringConfig"("name");

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "scoringConfigId" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "scoringConfigId" TEXT;

-- AlterTable
ALTER TABLE "RoundFormat" ADD COLUMN "scoringConfigId" TEXT;

-- CreateIndex
CREATE INDEX "Event_scoringConfigId_idx" ON "Event"("scoringConfigId");

-- CreateIndex
CREATE INDEX "Category_scoringConfigId_idx" ON "Category"("scoringConfigId");

-- CreateIndex
CREATE INDEX "RoundFormat_scoringConfigId_idx" ON "RoundFormat"("scoringConfigId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_scoringConfigId_fkey" FOREIGN KEY ("scoringConfigId") REFERENCES "ScoringConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_scoringConfigId_fkey" FOREIGN KEY ("scoringConfigId") REFERENCES "ScoringConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundFormat" ADD CONSTRAINT "RoundFormat_scoringConfigId_fkey" FOREIGN KEY ("scoringConfigId") REFERENCES "ScoringConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "MatchScore" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "scoreA" INTEGER NOT NULL,
    "scoreB" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchScore_judgeId_idx" ON "MatchScore"("judgeId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchScore_matchId_judgeId_key" ON "MatchScore"("matchId", "judgeId");

-- AddForeignKey
ALTER TABLE "MatchScore" ADD CONSTRAINT "MatchScore_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "BattleMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchScore" ADD CONSTRAINT "MatchScore_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

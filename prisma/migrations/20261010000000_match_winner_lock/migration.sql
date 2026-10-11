-- Add an explicit winner lock to battle matches.
-- Newly completed matches lock by default; existing COMPLETE matches are backfilled as locked.
ALTER TABLE "BattleMatch" ADD COLUMN "winnerLocked" BOOLEAN NOT NULL DEFAULT false;

UPDATE "BattleMatch" SET "winnerLocked" = true WHERE "status" = 'COMPLETE';

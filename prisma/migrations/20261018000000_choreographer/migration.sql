-- Add choreographer name to registrations (used by the Born to Dance
-- custom-audition flow, where the captain registers the whole crew).
ALTER TABLE "Registration" ADD COLUMN "choreographerName" TEXT;

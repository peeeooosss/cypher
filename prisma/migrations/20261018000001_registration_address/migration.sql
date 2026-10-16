-- Add address to registrations (used by the Born to Dance custom-audition
-- flow, collected for all categories/format).
ALTER TABLE "Registration" ADD COLUMN "address" TEXT;

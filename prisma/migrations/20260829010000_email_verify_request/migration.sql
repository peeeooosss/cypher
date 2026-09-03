-- CreateTable
CREATE TABLE "EmailVerifyRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerifyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerifyRequest_email_key" ON "EmailVerifyRequest"("email");

-- CreateIndex
CREATE INDEX "EmailVerifyRequest_expiresAt_idx" ON "EmailVerifyRequest"("expiresAt");

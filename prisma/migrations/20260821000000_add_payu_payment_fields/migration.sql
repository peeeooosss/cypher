ALTER TABLE "Payment"
  ALTER COLUMN "razorpayOrderId" DROP NOT NULL,
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
  ADD COLUMN "merchantTransactionId" TEXT,
  ADD COLUMN "providerPaymentId" TEXT,
  ADD COLUMN "providerSignature" TEXT,
  ADD COLUMN "providerStatus" TEXT,
  ADD COLUMN "metadata" JSONB;

CREATE UNIQUE INDEX "Payment_merchantTransactionId_key" ON "Payment"("merchantTransactionId");
CREATE INDEX "Payment_provider_providerStatus_idx" ON "Payment"("provider", "providerStatus");

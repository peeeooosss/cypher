import { prisma } from "@/lib/prisma";
import { gigWorkExpiryFrom } from "@/lib/pricing";

export interface PayUPaymentMetadata {
  purpose?: string;
  eventId?: string;
  gigId?: string;
  agreementId?: string;
  userId?: string;
  idempotencyKey?: string;
  [key: string]: unknown;
}

export async function applyPaymentEffects(metadataRaw: unknown): Promise<void> {
  const metadata = (metadataRaw ?? {}) as PayUPaymentMetadata;
  const { purpose, eventId, gigId, agreementId } = metadata;

  if (purpose === "FLAT_FEE" && eventId) {
    await prisma.event.updateMany({
      where: { id: eventId, flatFeePaid: false },
      data: {
        flatFeePaid: true,
        flatFeePaidAt: new Date(),
        flatFeePaymentStatus: "VERIFIED",
        flatFeePaymentMethod: "PAYU",
        flatFeePaymentVerifiedBy: "system",
      },
    });
  }

  if (purpose === "COMMISSION" && eventId) {
    await prisma.event.updateMany({
      where: { id: eventId, commissionPaid: false },
      data: {
        commissionPaid: true,
        commissionPaidAt: new Date(),
        commissionPaymentStatus: "VERIFIED",
        commissionPaymentMethod: "PAYU",
        commissionPaymentVerifiedBy: "system",
      },
    });
  }

  if (purpose === "GIG_POST" && gigId) {
    await prisma.gig.updateMany({
      where: { id: gigId, feePaid: false },
      data: {
        feePaid: true,
        feePaidAt: new Date(),
        feePaymentStatus: "VERIFIED",
        feePaymentMethod: "PAYU",
        feePaymentVerifiedBy: "system",
      },
    });
  }

  if (purpose === "GIG_WORK" && metadata.userId) {
    const paidAt = new Date();
    await prisma.user.updateMany({
      where: { id: metadata.userId, gigWorkPaidAt: null },
      data: {
        gigWorkEnabledAt: paidAt,
        gigWorkPaymentStatus: "VERIFIED",
        gigWorkPaidAt: paidAt,
        gigWorkExpiresAt: gigWorkExpiryFrom(paidAt),
        gigWorkPaymentMethod: "PAYU",
        gigWorkPaymentVerifiedBy: "system",
      },
    });
  }

  if (purpose === "GIG_CONNECTION" && agreementId) {
    await prisma.gigAgreement.updateMany({
      where: { id: agreementId, connectionPaidAt: null },
      data: {
        connectionPaidAt: new Date(),
        connectionPaymentStatus: "VERIFIED",
        connectionPaymentMethod: "PAYU",
        connectionPaymentVerifiedBy: "system",
      },
    });
  }
}
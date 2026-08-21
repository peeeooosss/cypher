import type { Payment } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { gigWorkExpiryFrom } from "@/lib/pricing";

export async function applyPayuPayment(payment: Payment, metadata: Record<string, unknown>) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: {
        status: "PAID",
        provider: "PAYU",
        providerPaymentId: typeof metadata.mihpayid === "string" ? metadata.mihpayid : null,
        providerSignature: typeof metadata.hash === "string" ? metadata.hash : null,
        providerStatus: typeof metadata.unmappedstatus === "string" ? metadata.unmappedstatus : metadata.status?.toString(),
        metadata: JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue,
      },
    });

    if (claimed.count === 0) {
      return { applied: false };
    }

    const now = new Date();
    const verifiedBy = "PAYU";

    switch (payment.type) {
      case "EVENT_FLAT_FEE":
        await tx.event.update({
          where: { id: payment.referenceId },
          data: {
            flatFeePaid: true,
            flatFeePaidAt: now,
            flatFeePaymentStatus: "VERIFIED",
            flatFeePaymentMethod: "PAYU",
            flatFeePaymentVerifiedBy: verifiedBy,
          },
        });
        break;
      case "EVENT_COMMISSION":
        await tx.event.update({
          where: { id: payment.referenceId },
          data: {
            commissionPaid: true,
            commissionPaidAt: now,
            commissionPaymentStatus: "VERIFIED",
            commissionPaymentMethod: "PAYU",
            commissionPaymentVerifiedBy: verifiedBy,
          },
        });
        break;
      case "GIG_POST":
        await tx.gig.update({
          where: { id: payment.referenceId },
          data: {
            feePaid: true,
            feePaidAt: now,
            feePaymentStatus: "VERIFIED",
            feePaymentMethod: "PAYU",
            feePaymentVerifiedBy: verifiedBy,
          },
        });
        break;
      case "GIG_WORK":
        await tx.user.update({
          where: { id: payment.referenceId },
          data: {
            gigWorkPaymentStatus: "VERIFIED",
            gigWorkPaymentMethod: "PAYU",
            gigWorkPaymentVerifiedBy: verifiedBy,
            gigWorkPaidAt: now,
            gigWorkEnabledAt: now,
            gigWorkExpiresAt: gigWorkExpiryFrom(now),
          },
        });
        break;
      case "GIG_CONNECTION": {
        const agreement = await tx.gigAgreement.findUnique({
          where: { id: payment.referenceId },
          select: { applicationId: true },
        });
        if (!agreement) throw new Error("Agreement not found for PayU payment");

        await tx.gigAgreement.update({
          where: { id: payment.referenceId },
          data: {
            status: "ACTIVE",
            connectionPaidAt: now,
            connectionPaymentStatus: "VERIFIED",
            connectionPaymentMethod: "PAYU",
            connectionPaymentVerifiedBy: verifiedBy,
          },
        });

        if (agreement.applicationId) {
          await tx.conversation.updateMany({
            where: { applicationId: agreement.applicationId },
            data: { status: "OPEN", unlockedAt: now },
          });
        }
        break;
      }
      default:
        throw new Error(`Unsupported PayU payment type: ${payment.type}`);
    }

    return { applied: true };
  });
}

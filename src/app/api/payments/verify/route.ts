import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentType } from "@/generated/prisma/enums";
import { badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { gigWorkExpiryFrom } from "@/lib/pricing";
import { verifyRazorpaySignature } from "@/lib/razorpay";

export const runtime = "nodejs";

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const parsed = verifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Missing payment fields");

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
  });

  if (!payment) return badRequest("Order not found");
  if (payment.payerId !== user.id) return badRequest("Order does not belong to this account");

  if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", razorpayPaymentId: razorpay_payment_id },
    });
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  const alreadyPaid = payment.status === "PAID";

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "PAID",
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    },
  });

  if (!alreadyPaid) {
    await applyPaymentSideEffects(payment.type, payment.referenceId, user.email ?? "system");
  }

  return NextResponse.json({ ok: true });
}

async function applyPaymentSideEffects(type: PaymentType, referenceId: string, verifiedBy: string) {
  const now = new Date();

  switch (type) {
    case PaymentType.EVENT_FLAT_FEE: {
      await prisma.event.update({
        where: { id: referenceId },
        data: {
          flatFeePaid: true,
          flatFeePaidAt: now,
          flatFeePaymentStatus: "VERIFIED",
          flatFeePaymentMethod: "RAZORPAY",
          flatFeePaymentVerifiedBy: verifiedBy,
        },
      });
      return;
    }

    case PaymentType.EVENT_COMMISSION: {
      await prisma.event.update({
        where: { id: referenceId },
        data: {
          commissionPaid: true,
          commissionPaidAt: now,
          commissionPaymentStatus: "VERIFIED",
          commissionPaymentMethod: "RAZORPAY",
          commissionPaymentVerifiedBy: verifiedBy,
        },
      });
      return;
    }

    case PaymentType.GIG_POST: {
      await prisma.gig.update({
        where: { id: referenceId },
        data: { feePaid: true, feePaidAt: now },
      });
      return;
    }

    case PaymentType.GIG_COMMISSION: {
      await prisma.gig.update({
        where: { id: referenceId },
        data: { commissionStatus: "VERIFIED" },
      });
      return;
    }

    case PaymentType.GIG_WORK: {
      await prisma.user.update({
        where: { id: referenceId },
        data: {
          gigWorkPaymentStatus: "VERIFIED",
          gigWorkPaymentMethod: "RAZORPAY",
          gigWorkPaymentVerifiedBy: verifiedBy,
          gigWorkPaidAt: now,
          gigWorkEnabledAt: now,
          gigWorkExpiresAt: gigWorkExpiryFrom(now),
        },
      });
      return;
    }

    case PaymentType.GIG_CONNECTION: {
      const agreement = await prisma.gigAgreement.findUnique({
        where: { id: referenceId },
        select: { applicationId: true, connectionPaidAt: true },
      });
      if (!agreement) return;

      await prisma.gigAgreement.update({
        where: { id: referenceId },
        data: { status: "ACTIVE", connectionPaidAt: now },
      });

      if (!agreement.connectionPaidAt && agreement.applicationId) {
        await prisma.conversation.updateMany({
          where: { applicationId: agreement.applicationId },
          data: { status: "OPEN", unlockedAt: now },
        });
      }
      return;
    }

    default:
      return;
  }
}

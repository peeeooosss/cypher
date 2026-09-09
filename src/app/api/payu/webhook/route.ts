import { NextResponse } from "next/server";
import { verifyPayUWebhookHash } from "@/lib/payu";
import { gigWorkExpiryFrom } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    if (!verifyPayUWebhookHash(data, process.env.PAYU_MERCHANT_SALT ?? "")) {
      console.error("PayU webhook hash verification failed", { txnid: data.txnid });
      return NextResponse.json({ status: "error", message: "Hash verification failed" }, { status: 400 });
    }

    const { txnid, status, mihpayid, amt, error_Message } = data;

    const payment = await prisma.payment.findFirst({
      where: { merchantTransactionId: txnid },
      select: { id: true, amountPaise: true, status: true, metadata: true },
    });

    if (!payment) {
      console.error("Payment not found for txnid", { txnid });
      return NextResponse.json({ status: "error", message: "Payment not found" }, { status: 404 });
    }

    const receivedAmountPaise = Math.round(parseFloat(amt) * 100);
    if (receivedAmountPaise !== payment.amountPaise) {
      console.error("Amount mismatch in webhook", { txnid, expected: payment.amountPaise, received: receivedAmountPaise });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: "Amount mismatch in webhook" },
      });
      return NextResponse.json({ status: "error", message: "Amount mismatch" }, { status: 400 });
    }

    if (payment.status === "PAID") {
      return NextResponse.json({ status: "ok", message: "Already processed" });
    }

    if (status === "success") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          providerPaymentId: mihpayid,
          providerStatus: "success",
          payuVerifiedAt: new Date(),
          payuHashVerified: true,
          metadata: { ...(payment.metadata as object), payuWebhook: data },
        },
      });

      await handlePaymentSuccess((payment.metadata ?? {}) as PaymentMetadata);
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: error_Message || "Payment failed" },
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("PayU webhook error:", error);
    return NextResponse.json({ status: "error", message: "Server error" }, { status: 500 });
  }
}

interface PaymentMetadata {
  purpose?: string;
  eventId?: string;
  gigId?: string;
  agreementId?: string;
  userId?: string;
  idempotencyKey?: string;
  [key: string]: unknown;
}

async function handlePaymentSuccess(metadata: PaymentMetadata) {
  const { purpose, eventId, gigId } = metadata;

  if (purpose === "FLAT_FEE" && eventId) {
    await prisma.event.update({
      where: { id: eventId },
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
    await prisma.event.update({
      where: { id: eventId },
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
    await prisma.gig.update({
      where: { id: gigId },
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
    await prisma.user.update({
      where: { id: metadata.userId },
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

  if (purpose === "GIG_CONNECTION" && gigId) {
    const { agreementId } = metadata;
    if (agreementId) {
      await prisma.gigAgreement.update({
        where: { id: agreementId },
        data: {
          connectionPaidAt: new Date(),
          connectionPaymentStatus: "VERIFIED",
          connectionPaymentMethod: "PAYU",
          connectionPaymentVerifiedBy: "system",
        },
      });
    }
  }
}
import { NextResponse } from "next/server";
import { verifyPayUWebhookHash } from "@/lib/payu";
import { applyPaymentEffects } from "@/lib/payu-applications";
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

    if (status === "success") {
      if (payment.status !== "PAID") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "PAID",
            providerPaymentId: mihpayid,
            providerStatus: "success",
            payuPaymentId: mihpayid,
            payuStatus: "success",
            payuVerifiedAt: new Date(),
            payuHashVerified: true,
            metadata: { ...(payment.metadata as object), payuWebhook: data },
          },
        });
      }
      await applyPaymentEffects(payment.metadata);
    } else if (payment.status !== "PAID") {
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
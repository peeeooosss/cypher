import { NextResponse } from "next/server";
import { verifyPayUCallbackHash, debugPayUCallbackHash, PayUCallbackData, resolveCallbackUrl } from "@/lib/payu";
import { prisma } from "@/lib/prisma";
import { applyPaymentEffects } from "@/lib/payu-applications";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;
    const callbackData = data as unknown as PayUCallbackData;
    const { txnid, status, mihpayid, amt } = callbackData;

    const salt = process.env.PAYU_MERCHANT_SALT ?? "";

    if (!verifyPayUCallbackHash(callbackData, salt)) {
      console.error("PayU callback hash verification failed", {
        txnid,
        debug: debugPayUCallbackHash(callbackData, salt),
      });
      return NextResponse.redirect(resolveCallbackUrl(request, "/payment/failed?reason=hash_verification_failed"));
    }

    const payment = await prisma.payment.findFirst({
      where: { merchantTransactionId: txnid },
      select: { id: true, amountPaise: true, status: true, metadata: true },
    });

    if (!payment) {
      console.error("Payment not found for txnid", { txnid });
      return NextResponse.redirect(resolveCallbackUrl(request, "/payment/failed?reason=payment_not_found"));
    }

    const receivedAmountPaise = Math.round(parseFloat(amt) * 100);
    if (receivedAmountPaise !== payment.amountPaise) {
      console.error("Amount mismatch", { txnid, expected: payment.amountPaise, received: receivedAmountPaise });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: "Amount mismatch" },
      });
      return NextResponse.redirect(resolveCallbackUrl(request, "/payment/failed?reason=amount_mismatch"));
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
            metadata: { ...(payment.metadata as object), payuCallback: { ...callbackData } as Record<string, string> },
          },
        });
      }
      await applyPaymentEffects(payment.metadata);
      return NextResponse.redirect(resolveCallbackUrl(request, `/payment/success?txnid=${encodeURIComponent(txnid ?? "")}`));
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: callbackData.error_Message || "Payment failed" },
    });
    return NextResponse.redirect(
      resolveCallbackUrl(
        request,
        `/payment/failed?txnid=${encodeURIComponent(txnid ?? "")}&reason=${encodeURIComponent(callbackData.error_Message || "Payment failed")}`,
      ),
    );
  } catch (error) {
    console.error("PayU callback error:", error);
    return NextResponse.redirect(resolveCallbackUrl(request, "/payment/failed?reason=server_error"));
  }
}

export async function GET(request: Request) {
  return POST(request);
}
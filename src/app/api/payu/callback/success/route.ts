import { verifyPayUCallbackHash, PayUCallbackData } from "@/lib/payu";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;
    const callbackData = data as unknown as PayUCallbackData;
    const { txnid, status, mihpayid, amt } = callbackData;

    if (!verifyPayUCallbackHash(callbackData, process.env.PAYU_MERCHANT_SALT ?? "")) {
      console.error("PayU callback hash verification failed", { txnid });
      return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment/failed?reason=hash_verification_failed`);
    }

    const payment = await prisma.payment.findFirst({
      where: { merchantTransactionId: txnid },
      select: { id: true, amountPaise: true, status: true, metadata: true },
    });

    if (!payment) {
      console.error("Payment not found for txnid", { txnid });
      return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment/failed?reason=payment_not_found`);
    }

    const receivedAmountPaise = Math.round(parseFloat(amt) * 100);
    if (receivedAmountPaise !== payment.amountPaise) {
      console.error("Amount mismatch", { txnid, expected: payment.amountPaise, received: receivedAmountPaise });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: "Amount mismatch" },
      });
      return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment/failed?reason=amount_mismatch`);
    }

    if (status === "success") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          providerPaymentId: mihpayid,
          providerStatus: "success",
          metadata: { ...(payment.metadata as object), payuCallback: { ...callbackData } as Record<string, string> },
        },
      });
      return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment/success?txnid=${txnid}`);
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: callbackData.error_Message || "Payment failed" },
      });
      return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment/failed?reason=${encodeURIComponent(callbackData.error_Message || "Payment failed")}`);
    }
  } catch (error) {
    console.error("PayU callback error:", error);
    return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment/failed?reason=server_error`);
  }
}

export async function GET(request: Request) {
  return POST(request);
}
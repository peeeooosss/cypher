import { NextResponse } from "next/server";
import { PayUCallbackData, resolveCallbackUrl } from "@/lib/payu";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;
    const callbackData = data as unknown as PayUCallbackData;
    const { txnid, error_Message } = callbackData;

    const payment = await prisma.payment.findFirst({
      where: { merchantTransactionId: txnid },
      select: { id: true },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: error_Message || "Payment failed or cancelled" },
      });
    }

    return NextResponse.redirect(
      resolveCallbackUrl(
        request,
        `/payment/failed?txnid=${encodeURIComponent(txnid ?? "")}&reason=${encodeURIComponent(error_Message || "Payment failed")}`,
      ),
    );
  } catch (error) {
    console.error("PayU failure callback error:", error);
    return NextResponse.redirect(resolveCallbackUrl(request, "/payment/failed?reason=server_error"));
  }
}

export async function GET(request: Request) {
  return POST(request);
}
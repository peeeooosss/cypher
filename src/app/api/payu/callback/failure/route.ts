import { PayUCallbackData } from "@/lib/payu";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

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

    return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment/failed?txnid=${txnid}&reason=${encodeURIComponent(error_Message || "Payment failed")}`);
  } catch (error) {
    console.error("PayU failure callback error:", error);
    return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment/failed?reason=server_error`);
  }
}

export async function GET(request: Request) {
  return POST(request);
}
import { prisma } from "@/lib/prisma";
import { applyPayuPayment } from "@/lib/payment-side-effects";
import { verifyPayuResponseHash } from "@/lib/payu";

export type PayuResult = {
  ok: boolean;
  status: "success" | "failure" | "pending";
  paymentId: string | null;
  error?: string;
};

export async function processPayuResponse(fields: Record<string, string>): Promise<PayuResult> {
  const txnid = fields.txnid?.trim();
  if (!txnid) return { ok: false, status: "failure", paymentId: null, error: "Missing transaction ID" };

  const payment = await prisma.payment.findUnique({
    where: { merchantTransactionId: txnid },
  });
  if (!payment) return { ok: false, status: "failure", paymentId: null, error: "Payment not found" };

  const status = normalizeStatus(fields.status);
  if (!verifyPayuResponseHash(fields)) {
    await markFailed(payment.id, fields, "Invalid PayU response hash");
    return { ok: false, status: "failure", paymentId: payment.id, error: "Invalid response hash" };
  }

  const amountPaise = Math.round(Number(fields.amount) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise !== payment.amountPaise) {
    await markFailed(payment.id, fields, "PayU amount mismatch");
    return { ok: false, status: "failure", paymentId: payment.id, error: "Amount mismatch" };
  }

  if (status === "success") {
    await applyPayuPayment(payment, fields);
    return { ok: true, status, paymentId: payment.id };
  }

  if (status === "failure") {
    await markFailed(payment.id, fields, "PayU reported failure");
  } else {
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: {
        providerStatus: fields.unmappedstatus ?? fields.status,
        metadata: JSON.parse(JSON.stringify(fields)),
      },
    });
  }

  return { ok: status !== "failure", status, paymentId: payment.id };
}

function normalizeStatus(status: string | undefined): PayuResult["status"] {
  if (status?.toLowerCase() === "success") return "success";
  if (status?.toLowerCase() === "pending") return "pending";
  return "failure";
}

async function markFailed(paymentId: string, fields: Record<string, string>, reason: string) {
  await prisma.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: {
      status: "FAILED",
      providerStatus: fields.unmappedstatus ?? fields.status ?? "failed",
      providerPaymentId: fields.mihpayid ?? null,
      metadata: { ...fields, processingError: reason },
    },
  });
}

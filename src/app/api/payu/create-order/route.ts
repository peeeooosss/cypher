import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createPayUOrder, generateTxnId } from "@/lib/payu";

const PURPOSE_TO_TYPE = {
  FLAT_FEE: "EVENT_FLAT_FEE",
  COMMISSION: "EVENT_COMMISSION",
  GIG_POST: "GIG_POST",
  GIG_WORK: "GIG_WORK",
  GIG_CONNECTION: "GIG_CONNECTION",
} as const;

const createOrderSchema = z.object({
  purpose: z.enum(["FLAT_FEE", "COMMISSION", "GIG_POST", "GIG_WORK", "GIG_CONNECTION"]),
  eventId: z.string().cuid().optional(),
  gigId: z.string().cuid().optional(),
  agreementId: z.string().cuid().optional(),
  amount: z.number().int().positive(),
  productInfo: z.string().min(1).max(255),
  firstname: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  udf1: z.string().max(255).optional(),
  udf2: z.string().max(255).optional(),
  udf3: z.string().max(255).optional(),
  udf4: z.string().max(255).optional(),
  udf5: z.string().max(255).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) return unauthorized();

    const parsed = createOrderSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid order data");

    const { purpose, eventId, gigId, agreementId, amount, productInfo, firstname, email, phone, udf1, udf2, udf3, udf4, udf5 } = parsed.data;

    if (purpose === "FLAT_FEE" || purpose === "COMMISSION") {
      if (!eventId) return badRequest("eventId required for organizer payments");
      const event = await prisma.event.findFirst({
        where: { id: eventId, organizerId: user.id },
        select: { id: true, flatFee: true, commissionDue: true, flatFeePaid: true, commissionPaid: true },
      });
      if (!event) return notFound("Event");

      if (purpose === "FLAT_FEE") {
        if (!event.flatFee || event.flatFeePaid) return badRequest("Flat fee not due or already paid");
        if (amount !== event.flatFee) return badRequest("Amount does not match flat fee");
      } else {
        if (!event.commissionDue || event.commissionDue <= 0 || event.commissionPaid) return badRequest("Commission not due or already paid");
        if (amount !== event.commissionDue) return badRequest("Amount does not match commission due");
      }
    }

    if (purpose === "GIG_POST" || purpose === "GIG_WORK" || purpose === "GIG_CONNECTION") {
      if (!gigId) return badRequest("gigId required for gig payments");
    }

    const txnid = generateTxnId(`CYPHR_${purpose}`);
    const idempotencyKey = `payu_${purpose}_${txnid}`;

    const existingPayment = await prisma.payment.findFirst({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existingPayment) return badRequest("Duplicate transaction");

    const order = createPayUOrder({
      txnid,
      amount: amount / 100,
      productinfo: productInfo,
      firstname,
      email,
      phone,
      udf1: udf1 || `purpose:${purpose}`,
      udf2: udf2 || `user:${user.id}`,
      udf3: udf3 || `event:${eventId || ""}`,
      udf4: udf4 || `gig:${gigId || ""}`,
      udf5: udf5 || `idempotency:${idempotencyKey}`,
    });

    let referenceId = user.id;
    if (purpose === "FLAT_FEE" || purpose === "COMMISSION") referenceId = eventId!;
    else if (purpose === "GIG_POST" || purpose === "GIG_CONNECTION") referenceId = agreementId || gigId!;
    else if (purpose === "GIG_WORK") referenceId = user.id;

    await prisma.payment.create({
      data: {
        type: PURPOSE_TO_TYPE[purpose],
        provider: "PAYU",
        referenceId,
        payerId: user.id,
        amountPaise: amount,
        currency: "INR",
        merchantTransactionId: txnid,
        metadata: {
          productInfo,
          purpose,
          eventId,
          gigId,
          agreementId,
          userId: user.id,
          idempotencyKey,
        },
        status: "PENDING",
        idempotencyKey,
      },
    });

    return NextResponse.json({ order, txnid, idempotencyKey }, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
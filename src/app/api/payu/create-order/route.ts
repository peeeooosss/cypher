import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PAYU_BASE_URL, PAYU_WEBHOOK_URL, createPayUOrder, generateTxnId } from "@/lib/payu";
import { chargeablePaise, commissionFor, getPricingConfig } from "@/lib/pricing";

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
  firstname: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20).optional(),
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

    const { purpose, eventId, gigId, agreementId, amount, productInfo, udf1, udf2, udf3, udf4, udf5 } = parsed.data;

    const pricing = await getPricingConfig();

    let expectedPaise: number | null = null;
    let referenceId = user.id;

    if (purpose === "FLAT_FEE" || purpose === "COMMISSION") {
      if (!eventId) return badRequest("eventId required for organizer payments");
      const event = await prisma.event.findFirst({
        where: { id: eventId, organizerId: user.id },
        select: { id: true, flatFee: true, flatFeePaid: true, commissionPaid: true },
      });
      if (!event) return notFound("Event");

      if (purpose === "FLAT_FEE") {
        if (!event.flatFee || event.flatFee <= 0) return badRequest("Flat fee not set");
        if (event.flatFeePaid) return badRequest("Flat fee already paid");
        expectedPaise = chargeablePaise(event.flatFee);
        referenceId = eventId;
      } else {
        if (event.commissionPaid) return badRequest("Commission already paid");
        const registrations = await prisma.registration.findMany({
          where: { category: { eventId }, paid: true },
          select: { entryFee: true, category: { select: { entryFee: true } } },
        });
        const entryFeeSum = registrations.reduce(
          (sum, r) => sum + (r.entryFee ?? r.category.entryFee ?? 0),
          0,
        );
        const commissionDue = await commissionFor(entryFeeSum);
        if (commissionDue <= 0) return badRequest("No commission due");
        expectedPaise = chargeablePaise(commissionDue);
        referenceId = eventId;
      }
    }

    if (purpose === "GIG_POST") {
      if (!gigId) return badRequest("gigId required for gig posting fee");
      const gig = await prisma.gig.findFirst({
        where: { id: gigId, organizerId: user.id },
        select: { id: true, feePaid: true, feePaymentStatus: true },
      });
      if (!gig) return notFound("Gig");
      if (gig.feePaid || gig.feePaymentStatus === "VERIFIED") return badRequest("Gig posting fee already paid");
      expectedPaise = chargeablePaise(pricing.gigFlatFee);
      referenceId = gigId;
    }

    if (purpose === "GIG_WORK") {
      const artist = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true, gigWorkPaymentStatus: true, gigWorkPaidAt: true },
      });
      if (!artist) return unauthorized();
      if (artist.role !== "ARTIST") return forbidden();
      if (artist.gigWorkPaymentStatus === "VERIFIED" || artist.gigWorkPaidAt) {
        return badRequest("Gig work access already active");
      }
      expectedPaise = chargeablePaise(pricing.gigWorkFee);
      referenceId = user.id;
    }

    if (purpose === "GIG_CONNECTION") {
      if (!agreementId) return badRequest("agreementId required for connection fee");
      const agreement = await prisma.gigAgreement.findFirst({
        where: { id: agreementId, artistId: user.id },
        select: { id: true, gigId: true, connectionPaymentStatus: true, connectionPaidAt: true },
      });
      if (!agreement) return forbidden();
      if (agreement.connectionPaymentStatus === "VERIFIED" || agreement.connectionPaidAt) {
        return badRequest("Connection fee already paid");
      }
      expectedPaise = chargeablePaise(pricing.gigConnectionFee);
      referenceId = agreementId;
    }

    if (expectedPaise === null) return badRequest("Invalid purpose");

    if (amount !== expectedPaise) {
      return badRequest("Amount does not match the expected payment");
    }

    const txnid = generateTxnId(`CYPHR_${purpose}`);
    const idempotencyKey = `payu_${purpose}_${txnid}`;

    const existingPayment = await prisma.payment.findFirst({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existingPayment) return badRequest("Duplicate transaction");

    const firstname = parsed.data.firstname || user.name || "CYPHR User";
    const email = parsed.data.email || user.email || "";
    const phone = parsed.data.phone || "9999999999";

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
      curl: PAYU_WEBHOOK_URL,
    });

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

    return NextResponse.json(
      { order, txnid, idempotencyKey, checkoutUrl: `${PAYU_BASE_URL}/_payment` },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
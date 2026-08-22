import { NextResponse } from "next/server";
import { z } from "zod";
import { getEventForOwner } from "@/lib/event-access";
import { badRequest, conflict, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { calculateCommission, GIG_CONNECTION_FEE, GIG_FLAT_FEE, GIG_WORK_FEE } from "@/lib/pricing";
import {
  amountForPayu,
  assertPayuConfig,
  createPayuRequestHash,
  firstNameFrom,
  payuCallbackUrl,
  PAYU_CHECKOUT_URL,
} from "@/lib/payu";

export const runtime = "nodejs";

const paymentTypes = ["EVENT_FLAT_FEE", "EVENT_COMMISSION", "GIG_POST", "GIG_WORK", "GIG_CONNECTION"] as const;
const schema = z.object({
  type: z.enum(paymentTypes),
  referenceId: z.string().cuid(),
  phone: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid payment data");

  try {
    assertPayuConfig();
    const { type, referenceId, phone } = parsed.data;
    const amountResult = await amountForPayment(type, referenceId, user.id, user.role);
    if ("response" in amountResult) return amountResult.response;
    const amount = amountResult.amount;
    if (amount < 1) return badRequest("No amount due for this payment");

    const existing = await prisma.payment.findFirst({
      where: { provider: "PAYU", type, referenceId, payerId: user.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true, metadata: true },
    });
    if (existing) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { id: existing.id, status: "PENDING" },
          data: {
            status: "FAILED",
            providerStatus: "abandoned",
            metadata: { ...(existing.metadata as Record<string, unknown>), processingError: "Abandoned — superseded by new attempt" },
          },
        });
        if (type === "GIG_WORK") {
          await tx.user.update({
            where: { id: user.id },
            data: { gigWorkPaymentStatus: "NONE" },
          });
        }
      });
    }

    const txnid = `cyphr_${Date.now()}_${cryptoRandomPart()}`.slice(0, 50);
    const payment = await prisma.payment.create({
      data: {
        type,
        provider: "PAYU",
        referenceId,
        payerId: user.id,
        amountPaise: amount * 100,
        currency: "INR",
        merchantTransactionId: txnid,
        providerStatus: "initiated",
        metadata: { phone },
        status: "PENDING",
      },
    });

    const amountText = amountForPayu(payment.amountPaise);
    const productinfo = productInfo(type);
    const firstname = firstNameFrom(user.name ?? null);
    const email = user.email ?? "";
    const udf = { udf1: type, udf2: referenceId, udf3: payment.id };

    return NextResponse.json({
      action: PAYU_CHECKOUT_URL,
      fields: {
        key: process.env.PAYU_MERCHANT_KEY,
        txnid,
        amount: amountText,
        productinfo,
        firstname,
        lastname: "",
        email,
        phone,
        surl: payuCallbackUrl(),
        furl: payuCallbackUrl(),
        curl: payuCallbackUrl(),
        udf1: udf.udf1,
        udf2: udf.udf2,
        udf3: udf.udf3,
        udf4: "",
        udf5: "",
        hash: createPayuRequestHash({ txnid, amount: amountText, productinfo, firstname, email, ...udf }),
      },
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

async function amountForPayment(
  type: (typeof paymentTypes)[number],
  referenceId: string,
  userId: string,
  role: string,
): Promise<{ amount: number } | { response: NextResponse }> {
  switch (type) {
    case "EVENT_FLAT_FEE": {
      if (role !== "ORGANIZER") return { response: forbidden() };
      const owned = await getEventForOwner(referenceId, userId);
      if (!owned) return { response: notFound("Event") };
      const event = await prisma.event.findUnique({ where: { id: referenceId }, select: { flatFee: true, flatFeePaid: true } });
      if (!event) return { response: notFound("Event") };
      if (event.flatFeePaid) return { response: conflict("Flat fee already paid") };
      return { amount: event.flatFee ?? 0 };
    }
    case "EVENT_COMMISSION": {
      if (role !== "ORGANIZER") return { response: forbidden() };
      if (!(await getEventForOwner(referenceId, userId))) return { response: notFound("Event") };
      const event = await prisma.event.findUnique({ where: { id: referenceId }, select: { commissionPaid: true } });
      if (!event) return { response: notFound("Event") };
      if (event.commissionPaid) return { response: conflict("Commission already paid") };
      const registrations = await prisma.registration.findMany({
        where: { category: { eventId: referenceId }, paid: true },
        select: { entryFee: true, category: { select: { entryFee: true } } },
      });
      return { amount: calculateCommission(
        registrations.map((registration) => ({
          paid: true,
          entryFee: registration.entryFee,
          categoryEntryFee: registration.category.entryFee,
        })),
      ).commissionDue };
    }
    case "GIG_POST": {
      if (role !== "ORGANIZER") return { response: forbidden() };
      const gig = await prisma.gig.findFirst({ where: { id: referenceId, organizerId: userId }, select: { feePaid: true } });
      if (!gig) return { response: notFound("Gig") };
      if (gig.feePaid) return { response: conflict("Gig posting fee already paid") };
      return { amount: GIG_FLAT_FEE };
    }
    case "GIG_WORK": {
      if (role !== "ARTIST" || referenceId !== userId) return { response: forbidden() };
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { gigWorkPaymentStatus: true, gigWorkExpiresAt: true } });
      if (!me) return { response: notFound("User") };
      if (me.gigWorkPaymentStatus === "VERIFIED" && me.gigWorkExpiresAt && me.gigWorkExpiresAt > new Date()) return { response: conflict("Gig Work is already active") };
      return { amount: GIG_WORK_FEE };
    }
    case "GIG_CONNECTION": {
      if (role !== "ARTIST") return { response: forbidden() };
      const agreement = await prisma.gigAgreement.findFirst({ where: { id: referenceId, artistId: userId }, select: { status: true, connectionPaidAt: true } });
      if (!agreement) return { response: notFound("Agreement") };
      if (agreement.connectionPaidAt) return { response: conflict("Connection fee already paid") };
      if (agreement.status !== "CONNECTION_PENDING") return { response: conflict("Accept the offer before paying the connection fee") };
      return { amount: GIG_CONNECTION_FEE };
    }
  }
}

function productInfo(type: (typeof paymentTypes)[number]): string {
  return {
    EVENT_FLAT_FEE: "CYPHR event activation fee",
    EVENT_COMMISSION: "CYPHR event commission",
    GIG_POST: "CYPHR gig posting fee",
    GIG_WORK: "CYPHR marketplace access",
    GIG_CONNECTION: "CYPHR connection fee",
  }[type];
}

function cryptoRandomPart(): string {
  return Math.random().toString(36).slice(2, 10);
}

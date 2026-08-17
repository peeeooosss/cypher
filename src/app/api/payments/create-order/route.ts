import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentType } from "@/generated/prisma/enums";
import { badRequest, conflict, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { razorpay, toPaise } from "@/lib/razorpay";
import { COMMISSION_RATE, GIG_FLAT_FEE, GIG_WORK_FEE, GIG_CONNECTION_FEE } from "@/lib/pricing";

export const runtime = "nodejs";

const orderSchema = z.object({
  type: z.nativeEnum(PaymentType),
  referenceId: z.string().cuid(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) return unauthorized();

  const parsed = orderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid order data");

  const { type, referenceId } = parsed.data;

  try {
    let amount: number;

    switch (type) {
      case PaymentType.EVENT_FLAT_FEE: {
        if (user.role !== "ORGANIZER") return forbidden();
        if (!(await getEventForOwner(referenceId, user.id))) return notFound("Event");

        const event = await prisma.event.findUnique({
          where: { id: referenceId },
          select: { flatFee: true, flatFeePaid: true },
        });
        if (!event) return notFound("Event");
        if (event.flatFeePaid) return conflict("Flat fee already paid");
        amount = event.flatFee ?? 0;
        break;
      }

      case PaymentType.EVENT_COMMISSION: {
        if (user.role !== "ORGANIZER") return forbidden();
        if (!(await getEventForOwner(referenceId, user.id))) return notFound("Event");

        const event = await prisma.event.findUnique({
          where: { id: referenceId },
          select: { commissionPaid: true },
        });
        if (!event) return notFound("Event");
        if (event.commissionPaid) return conflict("Commission already paid");

        const registrations = await prisma.registration.findMany({
          where: { category: { eventId: referenceId }, status: "CONFIRMED" },
          select: { entryFee: true },
        });
        amount = Math.round(registrations.reduce((sum, r) => sum + (r.entryFee ?? 0), 0) * COMMISSION_RATE);
        break;
      }

      case PaymentType.GIG_POST: {
        if (user.role !== "ORGANIZER") return forbidden();
        const gig = await prisma.gig.findFirst({
          where: { id: referenceId, organizerId: user.id },
          select: { feePaid: true },
        });
        if (!gig) return notFound("Gig");
        if (gig.feePaid) return conflict("Gig posting fee already paid");
        amount = GIG_FLAT_FEE;
        break;
      }

      case PaymentType.GIG_COMMISSION: {
        if (user.role !== "ORGANIZER") return forbidden();
        const gig = await prisma.gig.findFirst({
          where: { id: referenceId, organizerId: user.id },
          select: { commissionDue: true, commissionStatus: true },
        });
        if (!gig) return notFound("Gig");
        if (gig.commissionStatus === "VERIFIED") return conflict("Gig commission already paid");
        amount = gig.commissionDue ?? 0;
        break;
      }

      case PaymentType.GIG_WORK: {
        if (user.role !== "ARTIST") return forbidden();
        if (referenceId !== user.id) return forbidden();
        const me = await prisma.user.findUnique({
          where: { id: user.id },
          select: { gigWorkPaymentStatus: true, gigWorkExpiresAt: true },
        });
        if (!me) return notFound("User");
        if (me.gigWorkPaymentStatus === "VERIFIED" && me.gigWorkExpiresAt && me.gigWorkExpiresAt > new Date()) {
          return conflict("Gig Work is already active");
        }
        amount = GIG_WORK_FEE;
        break;
      }

      case PaymentType.GIG_CONNECTION: {
        if (user.role !== "ARTIST") return forbidden();
        const agreement = await prisma.gigAgreement.findFirst({
          where: { id: referenceId, artistId: user.id },
          select: { status: true, connectionPaidAt: true },
        });
        if (!agreement) return notFound("Agreement");
        if (agreement.connectionPaidAt) return conflict("Connection fee already paid");
        if (agreement.status !== "CONNECTION_PENDING") {
          return conflict("Accept the offer before paying the connection fee");
        }
        amount = GIG_CONNECTION_FEE;
        break;
      }

      default:
        return badRequest("Unsupported payment type");
    }

    if (amount < 1) {
      return badRequest("No amount due for this payment");
    }

    const receipt = `${type}_${referenceId.slice(0, 12)}_${Date.now()}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: toPaise(amount),
      currency: "INR",
      receipt,
    });

    await prisma.payment.create({
      data: {
        type,
        referenceId,
        payerId: user.id,
        amountPaise: toPaise(amount),
        currency: "INR",
        razorpayOrderId: order.id,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amountPaise: toPaise(amount),
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

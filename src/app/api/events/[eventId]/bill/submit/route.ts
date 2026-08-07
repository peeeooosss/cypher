import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Context = { params: Promise<{ eventId: string }> };

const bodySchema = z.object({
  method: z.string().min(1).default("UPI"),
  type: z.enum(["FLAT_FEE", "COMMISSION"]).default("FLAT_FEE"),
});

export async function POST(_: Request, { params }: Context) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  if (!(await getEventForOwner(eventId, user.id))) {
    return notFound("Event");
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await _.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: user.id },
      select: {
        id: true,
        flatFee: true,
        flatFeePaid: true,
        flatFeePaymentStatus: true,
        commissionDue: true,
        commissionPaid: true,
        commissionPaymentStatus: true,
      },
    });

    if (!event) {
      return notFound("Event");
    }

    if (body.type === "COMMISSION") {
      if (event.commissionDue == null || event.commissionDue <= 0) {
        return NextResponse.json({ error: "No commission due for this event" }, { status: 400 });
      }

      if (event.commissionPaid) {
        return NextResponse.json({ error: "Commission already paid" }, { status: 409 });
      }

      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          commissionPaymentStatus: "PENDING",
          commissionPaymentMethod: body.method,
          commissionPaymentSentAt: new Date(),
        },
        select: {
          id: true,
          commissionDue: true,
          commissionPaymentStatus: true,
          commissionPaymentMethod: true,
          commissionPaymentSentAt: true,
        },
      });

      return NextResponse.json(updated);
    }

    if (event.flatFee == null || event.flatFee <= 0) {
      return NextResponse.json({ error: "No flat fee set for this event" }, { status: 400 });
    }

    if (event.flatFeePaid) {
      return NextResponse.json({ error: "Flat fee already paid" }, { status: 409 });
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        flatFeePaymentStatus: "PENDING",
        flatFeePaymentMethod: body.method,
        flatFeePaymentSentAt: new Date(),
      },
      select: {
        id: true,
        flatFee: true,
        flatFeePaymentStatus: true,
        flatFeePaymentMethod: true,
        flatFeePaymentSentAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

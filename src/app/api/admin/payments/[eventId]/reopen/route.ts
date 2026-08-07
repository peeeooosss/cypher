import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ADMIN") {
    return forbidden();
  }

  let type: "FLAT_FEE" | "COMMISSION" = "FLAT_FEE";
  try {
    const body = await request.json();
    if (body?.type === "COMMISSION") {
      type = "COMMISSION";
    }
  } catch {
    // no body — treat as flat fee
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      return notFound("Event");
    }

    if (type === "COMMISSION") {
      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          commissionPaymentStatus: "NONE",
          commissionPaymentMethod: null,
          commissionPaymentSentAt: null,
          commissionPaymentVerifiedBy: null,
          commissionPaid: false,
          commissionPaidAt: null,
        },
        select: {
          id: true,
          title: true,
          commissionPaid: true,
          commissionPaymentStatus: true,
        },
      });

      return NextResponse.json(updated);
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        flatFeePaymentStatus: "NONE",
        flatFeePaymentMethod: null,
        flatFeePaymentSentAt: null,
        flatFeePaymentVerifiedBy: null,
        flatFeePaid: false,
        flatFeePaidAt: null,
      },
      select: {
        id: true,
        title: true,
        flatFeePaid: true,
        flatFeePaymentStatus: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

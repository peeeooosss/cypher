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
      select: { id: true, flatFee: true, commissionDue: true },
    });

    if (!event) {
      return notFound("Event");
    }

    if (type === "COMMISSION") {
      if (event.commissionDue == null || event.commissionDue <= 0) {
        return NextResponse.json({ error: "Event has no commission due" }, { status: 400 });
      }

      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          commissionPaymentStatus: "VERIFIED",
          commissionPaymentVerifiedBy: user.email,
          commissionPaid: true,
          commissionPaidAt: new Date(),
        },
        select: {
          id: true,
          title: true,
          commissionDue: true,
          commissionPaid: true,
          commissionPaymentStatus: true,
          commissionPaymentVerifiedBy: true,
          commissionPaidAt: true,
        },
      });

      return NextResponse.json(updated);
    }

    if (event.flatFee == null || event.flatFee <= 0) {
      return NextResponse.json({ error: "Event has no flat fee set" }, { status: 400 });
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        flatFeePaymentStatus: "VERIFIED",
        flatFeePaymentVerifiedBy: user.email,
        flatFeePaid: true,
        flatFeePaidAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        flatFee: true,
        flatFeePaid: true,
        flatFeePaymentStatus: true,
        flatFeePaymentVerifiedBy: true,
        flatFeePaidAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

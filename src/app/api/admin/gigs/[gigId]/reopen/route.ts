import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ gigId: string }> };

export async function POST(_request: Request, { params }: Context) {
  const { gigId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ADMIN") {
    return forbidden();
  }

  try {
    const gig = await prisma.gig.findFirst({
      where: { id: gigId },
      select: { id: true },
    });

    if (!gig) {
      return notFound("Gig");
    }

    const updated = await prisma.gig.update({
      where: { id: gigId },
      data: {
        feePaid: false,
        feePaidAt: null,
        feePaymentStatus: "NONE",
        feePaymentMethod: null,
        feePaymentSentAt: null,
        feePaymentVerifiedBy: null,
      },
      select: { id: true, feePaid: true, feePaymentStatus: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

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
      select: { id: true, feePaymentStatus: true },
    });

    if (!gig) {
      return notFound("Gig");
    }

    if (gig.feePaymentStatus !== "PENDING") {
      return NextResponse.json(
        { error: "Gig has no posting fee payment waiting for verification" },
        { status: 400 },
      );
    }

    const paidAt = new Date();

    const updated = await prisma.gig.update({
      where: { id: gigId },
      data: {
        feePaid: true,
        feePaidAt: paidAt,
        feePaymentStatus: "VERIFIED",
        feePaymentVerifiedBy: user.email,
      },
      select: { id: true, title: true, feePaid: true, feePaidAt: true, feePaymentStatus: true, feePaymentVerifiedBy: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

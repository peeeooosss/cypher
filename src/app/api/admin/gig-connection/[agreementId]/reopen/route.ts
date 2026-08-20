import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ agreementId: string }> };

export async function POST(_request: Request, { params }: Context) {
  const { agreementId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ADMIN") {
    return forbidden();
  }

  try {
    const agreement = await prisma.gigAgreement.findFirst({
      where: { id: agreementId },
      select: { id: true },
    });

    if (!agreement) {
      return notFound("Agreement");
    }

    const updated = await prisma.gigAgreement.update({
      where: { id: agreementId },
      data: {
        connectionPaidAt: null,
        connectionPaymentStatus: "NONE",
        connectionPaymentMethod: null,
        connectionPaymentSentAt: null,
        connectionPaymentVerifiedBy: null,
      },
      select: { id: true, status: true, connectionPaidAt: true, connectionPaymentStatus: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

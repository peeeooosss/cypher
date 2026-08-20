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
      select: { id: true, status: true, applicationId: true, connectionPaidAt: true, connectionPaymentStatus: true },
    });

    if (!agreement) {
      return notFound("Agreement");
    }

    if (agreement.connectionPaymentStatus !== "PENDING") {
      return NextResponse.json(
        { error: "No connection fee payment waiting for verification" },
        { status: 400 },
      );
    }

    const now = new Date();

    const updated = await prisma.gigAgreement.update({
      where: { id: agreementId },
      data: {
        status: "ACTIVE",
        connectionPaidAt: now,
        connectionPaymentStatus: "VERIFIED",
        connectionPaymentVerifiedBy: user.email,
      },
      select: {
        id: true,
        status: true,
        connectionPaidAt: true,
        connectionPaymentStatus: true,
        connectionPaymentVerifiedBy: true,
      },
    });

    if (!agreement.connectionPaidAt && agreement.applicationId) {
      await prisma.conversation.updateMany({
        where: { applicationId: agreement.applicationId },
        data: { status: "OPEN", unlockedAt: now },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

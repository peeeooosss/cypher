import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, conflict, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ agreementId: string }> };

const submitSchema = z.object({
  method: z.string().trim().min(1).max(20).default("UPI"),
});

export async function POST(request: Request, { params }: Context) {
  const { agreementId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ARTIST") {
    return forbidden();
  }

  const parsed = submitSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid data");
  }

  const agreement = await prisma.gigAgreement.findFirst({
    where: { id: agreementId, artistId: user.id },
    select: { id: true, status: true, connectionPaidAt: true, connectionPaymentStatus: true },
  });

  if (!agreement) {
    return notFound("Agreement");
  }

  if (agreement.status !== "CONNECTION_PENDING") {
    return conflict("This agreement is not awaiting a connection fee");
  }

  if (agreement.connectionPaidAt) {
    return conflict("Connection fee already paid");
  }

  if (agreement.connectionPaymentStatus === "PENDING") {
    return conflict("Your payment is already being verified");
  }

  try {
    const updated = await prisma.gigAgreement.update({
      where: { id: agreementId },
      data: {
        connectionPaymentStatus: "PENDING",
        connectionPaymentMethod: parsed.data.method,
        connectionPaymentSentAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        connectionPaymentStatus: true,
        connectionPaymentMethod: true,
        connectionPaymentSentAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

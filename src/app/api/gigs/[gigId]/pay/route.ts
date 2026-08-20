import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, conflict, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ gigId: string }> };

const submitSchema = z.object({
  method: z.string().trim().min(1).max(20).default("UPI"),
});

export async function POST(request: Request, { params }: Context) {
  const { gigId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const parsed = submitSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid data");
  }

  const owned = await prisma.gig.findFirst({
    where: { id: gigId, organizerId: user.id },
    select: { id: true, feePaid: true, feePaymentStatus: true },
  });

  if (!owned) {
    return notFound("Gig");
  }

  if (owned.feePaid) {
    return conflict("This gig's posting fee is already paid");
  }

  if (owned.feePaymentStatus === "PENDING") {
    return conflict("Your payment is already being verified");
  }

  try {
    const gig = await prisma.gig.update({
      where: { id: gigId },
      data: {
        feePaymentStatus: "PENDING",
        feePaymentMethod: parsed.data.method,
        feePaymentSentAt: new Date(),
      },
      select: { id: true, feePaid: true, feePaymentStatus: true, feePaymentMethod: true, feePaymentSentAt: true },
    });
    return NextResponse.json(gig);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

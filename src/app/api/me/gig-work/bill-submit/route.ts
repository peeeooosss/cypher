import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, conflict, forbidden, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const submitSchema = z.object({
  method: z.string().trim().min(1).max(20).default("UPI"),
});

export async function POST(request: Request) {
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

  try {
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { gigWorkPaymentStatus: true, gigWorkPaidAt: true },
    });

    if (me?.gigWorkPaymentStatus === "VERIFIED" || me?.gigWorkPaidAt) {
      return conflict("Gig Work is already active");
    }

    if (me?.gigWorkPaymentStatus === "PENDING") {
      return conflict("Your payment is already being verified");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        gigWorkPaymentStatus: "PENDING",
        gigWorkPaymentMethod: parsed.data.method,
        gigWorkPaymentSentAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        gigWorkPaymentStatus: true,
        gigWorkPaymentMethod: true,
        gigWorkPaymentSentAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

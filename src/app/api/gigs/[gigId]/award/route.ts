import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { GIG_COMMISSION_RATE } from "@/lib/pricing";

type Context = { params: Promise<{ gigId: string }> };

const awardSchema = z.object({
  amount: z.number().int().min(1),
});

export async function POST(request: Request, { params }: Context) {
  const { gigId } = await params;
  const user = await getCurrentUser();

  if (!user) return unauthorized();
  if (user.role !== "ORGANIZER") return forbidden();

  const gig = await prisma.gig.findFirst({
    where: { id: gigId, organizerId: user.id },
    select: { id: true, commissionStatus: true },
  });
  if (!gig) return notFound("Gig");
  if (gig.commissionStatus === "VERIFIED") {
    return NextResponse.json({ error: "Commission already settled" }, { status: 409 });
  }

  const parsed = awardSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid amount");

  try {
    const updated = await prisma.gig.update({
      where: { id: gigId },
      data: {
        awardedAmount: parsed.data.amount,
        commissionDue: Math.round(parsed.data.amount * GIG_COMMISSION_RATE),
        commissionStatus: "PENDING",
        status: "FILLED",
      },
      select: {
        id: true,
        awardedAmount: true,
        commissionDue: true,
        commissionStatus: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

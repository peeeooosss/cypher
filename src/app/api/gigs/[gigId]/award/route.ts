import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

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
    select: { id: true, status: true },
  });
  if (!gig) return notFound("Gig");
  if (gig.status === "FILLED") {
    return NextResponse.json({ error: "Gig already awarded" }, { status: 409 });
  }

  const parsed = awardSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid amount");

  try {
    const updated = await prisma.gig.update({
      where: { id: gigId },
      data: {
        awardedAmount: parsed.data.amount,
        status: "FILLED",
      },
      select: {
        id: true,
        awardedAmount: true,
        status: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

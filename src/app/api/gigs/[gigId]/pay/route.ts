import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ gigId: string }> };

export async function POST(_: Request, { params }: Context) {
  const { gigId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const owned = await prisma.gig.findFirst({
    where: { id: gigId, organizerId: user.id },
    select: { id: true },
  });

  if (!owned) {
    return notFound("Gig");
  }

  try {
    const gig = await prisma.gig.update({
      where: { id: gigId },
      data: { feePaid: true, feePaidAt: new Date() },
      select: { id: true, feePaid: true, feePaidAt: true },
    });
    return NextResponse.json(gig);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

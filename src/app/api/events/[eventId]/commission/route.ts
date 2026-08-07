import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { COMMISSION_RATE } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ eventId: string }> };

export async function GET(_: Request, { params }: Context) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  if (!(await getEventForOwner(eventId, user.id))) {
    return notFound("Event");
  }

  try {
    const categories = await prisma.category.findMany({
      where: { eventId },
      select: {
        id: true,
        name: true,
        entryFee: true,
        entryCurrency: true,
        registrations: {
          where: { status: "CONFIRMED" },
          select: { entryFee: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const breakdown = categories.map((category) => {
      const entryFeeSum = category.registrations.reduce((sum, r) => sum + (r.entryFee ?? 0), 0);
      return {
        id: category.id,
        name: category.name,
        registrations: category.registrations.length,
        entryFeeSum,
        commission: Math.round(entryFeeSum * COMMISSION_RATE),
      };
    });

    const commissionDue = breakdown.reduce((sum, c) => sum + c.commission, 0);

    return NextResponse.json({ commissionDue, categories: breakdown });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

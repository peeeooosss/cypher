import { NextResponse } from "next/server";
import { forbidden, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type DashboardRouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_: Request, { params }: DashboardRouteContext) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId, organizerId: user.id },
    include: {
      categories: {
        include: {
          rounds: { orderBy: { order: "asc" } },
          judgeSlots: { select: { id: true, code: true, name: true, isActive: true } },
          prizePool: true,
          _count: { select: { registrations: true, registrationMembers: true } },
        },
        orderBy: { name: "asc" },
      },
      judgeSlots: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!event) {
    return notFound("Event");
  }

  return NextResponse.json(event);
}

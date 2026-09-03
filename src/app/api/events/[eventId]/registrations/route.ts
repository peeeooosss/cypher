import { NextResponse } from "next/server";
import { z } from "zod";
import { RegistrationStatus } from "@/generated/prisma/enums";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type EventRegistrationsContext = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, { params }: EventRegistrationsContext) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return unauthorized();
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });

    if (!event) {
      return notFound("Event");
    }

    if (event.organizerId !== user.id) {
      return forbidden();
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const parsedStatus = status ? z.enum(RegistrationStatus).safeParse(status) : null;
    const categoryFilter = url.searchParams.get("categoryId");

    const registrations = await prisma.registration.findMany({
      where: {
        categoryId: categoryFilter ?? undefined,
        status: parsedStatus?.success ? parsedStatus.data : undefined,
        category: { eventId },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true, format: true, minMembers: true, maxMembers: true, entryFee: true, entryCurrency: true } },
        members: { include: { user: { select: { id: true, name: true, username: true } } } },
        dancerScores: { select: { score: true } },
      },
      orderBy: [{ category: { name: "asc" } }, { createdAt: "asc" }],
    });

    return NextResponse.json(registrations);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

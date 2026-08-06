import { NextResponse } from "next/server";
import { z } from "zod";
import { EventStatus, EventType } from "@/generated/prisma/enums";
import { badRequest, conflict, forbidden, isUniqueConstraintError, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const updateEventSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  eventType: z.enum(EventType).nullable().optional(),
  posterUrl: z.string().trim().max(3_000_000).nullable().optional(),
  venue: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  startsAt: z.coerce.date().optional(),
  status: z.enum(EventStatus).optional(),
});

type EventRouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_: Request, { params }: EventRouteContext) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: { select: { id: true, name: true } },
      categories: {
        include: { _count: { select: { registrations: true, matches: true } } },
      },
      _count: { select: { matches: true } },
    },
  });

  return event ? NextResponse.json(event) : notFound("Event");
}

export async function PATCH(request: Request, { params }: EventRouteContext) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const ownedEvent = await prisma.event.findFirst({
    where: { id: eventId, organizerId: user.id },
    select: { id: true },
  });

  if (!ownedEvent) {
    return notFound("Event");
  }

  const parsed = updateEventSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid event data");
  }

  try {
    const event = await prisma.event.update({
      where: { id: eventId },
      data: parsed.data,
    });

    return NextResponse.json(event);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("An event with this slug already exists");
    }

    console.error(error);
    return serverError();
  }
}

export async function DELETE(_: Request, { params }: EventRouteContext) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: user.id },
    select: { id: true, status: true },
  });

  if (!event) {
    return notFound("Event");
  }

  if (event.status !== EventStatus.DRAFT) {
    return conflict("Only draft events can be deleted");
  }

  await prisma.event.delete({ where: { id: eventId } });
  return new NextResponse(null, { status: 204 });
}

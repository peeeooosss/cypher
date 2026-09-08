import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getEventForOwner } from "@/lib/event-access";

type EventScheduleContext = { params: Promise<{ eventId: string }> };

const scheduleSchema = z.object({
  id: z.string().cuid().optional(),
  title: z.string().trim().min(1).max(200),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  displayOrder: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
});

export async function GET(_: Request, { params }: EventScheduleContext) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });

    if (!event) return notFound("Event");

    const isOwner = event.organizerId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) return forbidden();

    const items = await prisma.eventScheduleItem.findMany({
      where: { eventId },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: Request, { params }: EventScheduleContext) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();

    const owned = await getEventForOwner(eventId, user.id);
    if (!owned) return notFound("Event");

    const parsed = scheduleSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid schedule data");

    const item = await prisma.eventScheduleItem.create({
      data: {
        ...parsed.data,
        eventId,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
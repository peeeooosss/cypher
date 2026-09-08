import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getEventForOwner } from "@/lib/event-access";

type ScheduleItemContext = { params: Promise<{ eventId: string; scheduleId: string }> };

const updateScheduleSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: ScheduleItemContext) {
  try {
    const { eventId, scheduleId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();

    const owned = await getEventForOwner(eventId, user.id);
    if (!owned) return notFound("Event");

    const existing = await prisma.eventScheduleItem.findFirst({
      where: { id: scheduleId, eventId },
    });
    if (!existing) return notFound("Schedule item");

    const parsed = updateScheduleSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid schedule data");

    const item = await prisma.eventScheduleItem.update({
      where: { id: scheduleId },
      data: parsed.data,
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function DELETE(_: Request, { params }: ScheduleItemContext) {
  try {
    const { eventId, scheduleId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();

    const owned = await getEventForOwner(eventId, user.id);
    if (!owned) return notFound("Event");

    const existing = await prisma.eventScheduleItem.findFirst({
      where: { id: scheduleId, eventId },
    });
    if (!existing) return notFound("Schedule item");

    await prisma.eventScheduleItem.delete({ where: { id: scheduleId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
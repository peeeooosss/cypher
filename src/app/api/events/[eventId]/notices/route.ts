import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getEventForOwner } from "@/lib/event-access";

type EventNoticesContext = { params: Promise<{ eventId: string }> };

const noticeSchema = z.object({
  id: z.string().cuid().optional(),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
  link: z.string().trim().max(3000).nullable().optional(),
  isArchived: z.boolean().default(false),
});

export async function GET(_: Request, { params }: EventNoticesContext) {
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

    const notices = await prisma.eventNotice.findMany({
      where: { eventId },
      orderBy: { publishedAt: "desc" },
    });

    return NextResponse.json(notices);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: Request, { params }: EventNoticesContext) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();

    const owned = await getEventForOwner(eventId, user.id);
    if (!owned) return notFound("Event");

    const parsed = noticeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid notice data");

    const notice = await prisma.eventNotice.create({
      data: {
        ...parsed.data,
        eventId,
      },
    });

    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
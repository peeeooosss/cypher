import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getEventForOwner } from "@/lib/event-access";

type NoticeContext = { params: Promise<{ eventId: string; noticeId: string }> };

const updateNoticeSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  message: z.string().trim().min(1).max(5000).optional(),
  link: z.string().trim().max(3000).nullable().optional(),
  isArchived: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: NoticeContext) {
  try {
    const { eventId, noticeId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();

    const owned = await getEventForOwner(eventId, user.id);
    if (!owned) return notFound("Event");

    const existing = await prisma.eventNotice.findFirst({
      where: { id: noticeId, eventId },
    });
    if (!existing) return notFound("Notice");

    const parsed = updateNoticeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid notice data");

    const notice = await prisma.eventNotice.update({
      where: { id: noticeId },
      data: parsed.data,
    });

    return NextResponse.json(notice);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function DELETE(_: Request, { params }: NoticeContext) {
  try {
    const { eventId, noticeId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();

    const owned = await getEventForOwner(eventId, user.id);
    if (!owned) return notFound("Event");

    const existing = await prisma.eventNotice.findFirst({
      where: { id: noticeId, eventId },
    });
    if (!existing) return notFound("Notice");

    await prisma.eventNotice.delete({ where: { id: noticeId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
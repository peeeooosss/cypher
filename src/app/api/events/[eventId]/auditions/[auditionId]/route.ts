import { NextResponse } from "next/server";
import { z } from "zod";
import { AuditionMode } from "@/generated/prisma/enums";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const updateAuditionSchema = z.object({
  mode: z.nativeEnum(AuditionMode).optional(),
  city: z.string().trim().max(120).nullable().optional(),
  categoryId: z.string().trim().min(1).max(64).nullable().optional(),
  details: z.string().trim().max(5000).nullable().optional(),
  announcementText: z.string().trim().max(2000).nullable().optional(),
  whatsappNumber: z.string().trim().max(20).nullable().optional(),
  displayOrder: z.number().int().min(0).max(1000).optional(),
  isPublished: z.boolean().optional(),
});

type Context = { params: Promise<{ eventId: string; auditionId: string }> };

async function requireOwner(eventId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: unauthorized() };
  if (user.role !== "ORGANIZER") return { error: forbidden() };
  if (!(await getEventForOwner(eventId, user.id))) return { error: notFound("Event") };
  return { user };
}

const auditionSelect = {
  id: true,
  eventId: true,
  mode: true,
  city: true,
  categoryId: true,
  details: true,
  announcementText: true,
  whatsappNumber: true,
  displayOrder: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, entryFee: true, entryCurrency: true, format: true } },
} as const;

export async function PATCH(request: Request, { params }: Context) {
  const { eventId, auditionId } = await params;
  const owner = await requireOwner(eventId);
  if (owner.error) return owner.error;

  const parsed = updateAuditionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid audition data");
  }

  const existing = await prisma.audition.findFirst({
    where: { id: auditionId, eventId },
    select: { id: true, mode: true },
  });
  if (!existing) return notFound("Audition");

  const nextMode = parsed.data.mode ?? existing.mode;
  const nextCity = parsed.data.city !== undefined ? parsed.data.city?.trim() || null : undefined;
  if (nextMode === AuditionMode.OFFLINE && nextCity !== undefined && !nextCity) {
    const current = await prisma.audition.findUnique({ where: { id: auditionId }, select: { city: true } });
    if (!current?.city?.trim()) return badRequest("Offline auditions need a city");
  }

  if (parsed.data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: parsed.data.categoryId, eventId },
      select: { id: true },
    });
    if (!category) return badRequest("Category must belong to this event");
  }

  try {
    const audition = await prisma.audition.update({
      where: { id: auditionId },
      data: {
        ...(parsed.data.mode !== undefined ? { mode: parsed.data.mode } : {}),
        ...(parsed.data.city !== undefined ? { city: parsed.data.city?.trim() || null } : {}),
        ...(parsed.data.categoryId !== undefined ? { categoryId: parsed.data.categoryId || null } : {}),
        ...(parsed.data.details !== undefined ? { details: parsed.data.details?.trim() || null } : {}),
        ...(parsed.data.announcementText !== undefined
          ? { announcementText: parsed.data.announcementText?.trim() || null }
          : {}),
        ...(parsed.data.whatsappNumber !== undefined
          ? { whatsappNumber: parsed.data.whatsappNumber?.trim() || null }
          : {}),
        ...(parsed.data.displayOrder !== undefined ? { displayOrder: parsed.data.displayOrder } : {}),
        ...(parsed.data.isPublished !== undefined ? { isPublished: parsed.data.isPublished } : {}),
      },
      select: auditionSelect,
    });

    return NextResponse.json(audition);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function DELETE(_: Request, { params }: Context) {
  const { eventId, auditionId } = await params;
  const owner = await requireOwner(eventId);
  if (owner.error) return owner.error;

  const existing = await prisma.audition.findFirst({
    where: { id: auditionId, eventId },
    select: { id: true },
  });
  if (!existing) return notFound("Audition");

  try {
    await prisma.audition.delete({ where: { id: auditionId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

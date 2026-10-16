import { NextResponse } from "next/server";
import { z } from "zod";
import { AuditionMode } from "@/generated/prisma/enums";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const auditionSchema = z.object({
  mode: z.nativeEnum(AuditionMode),
  city: z.string().trim().max(120).nullable().optional(),
  categoryId: z.string().trim().min(1).max(64).nullable().optional(),
  details: z.string().trim().max(5000).nullable().optional(),
  announcementText: z.string().trim().max(2000).nullable().optional(),
  whatsappNumber: z.string().trim().max(20).nullable().optional(),
  displayOrder: z.number().int().min(0).max(1000).optional(),
  isPublished: z.boolean().optional(),
});

type Context = { params: Promise<{ eventId: string }> };

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

export async function GET(_: Request, { params }: Context) {
  const { eventId } = await params;
  const owner = await requireOwner(eventId);
  if (owner.error) return owner.error;

  const auditions = await prisma.audition.findMany({
    where: { eventId },
    select: auditionSelect,
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(auditions);
}

export async function POST(request: Request, { params }: Context) {
  const { eventId } = await params;
  const owner = await requireOwner(eventId);
  if (owner.error) return owner.error;

  const parsed = auditionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid audition data");
  }

  const { mode, city, categoryId } = parsed.data;
  if (mode === AuditionMode.OFFLINE && !city?.trim()) {
    return badRequest("Offline auditions need a city");
  }
  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, eventId },
      select: { id: true },
    });
    if (!category) return badRequest("Category must belong to this event");
  }

  try {
    const audition = await prisma.audition.create({
      data: {
        eventId,
        mode,
        city: city?.trim() || null,
        categoryId: categoryId || null,
        details: parsed.data.details?.trim() || null,
        announcementText: parsed.data.announcementText?.trim() || null,
        whatsappNumber: parsed.data.whatsappNumber?.trim() || null,
        displayOrder: parsed.data.displayOrder ?? 0,
        isPublished: parsed.data.isPublished ?? true,
      },
      select: auditionSelect,
    });

    return NextResponse.json(audition, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

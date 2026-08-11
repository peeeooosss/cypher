import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, conflict, forbidden, isUniqueConstraintError, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { CategoryFormat } from "@/generated/prisma/enums";
import { BATTLE_FORMATS, COMPETITION_FORMATS, defaultRosterSize, isBattleType, isCompetitionType, isWorkshopType } from "@/lib/event-types";

const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  format: z.nativeEnum(CategoryFormat).optional(),
  maxCompetitors: z.number().int().positive().max(256).nullable().optional(),
  minMembers: z.number().int().positive().max(20).optional(),
  maxMembers: z.number().int().positive().max(20).optional(),
  entryFee: z.number().int().min(0).max(10000000).nullable().optional(),
  entryCurrency: z.string().trim().min(1).max(8).optional(),
});

type CategoryRouteContext = { params: Promise<{ categoryId: string }> };

export async function PATCH(request: Request, { params }: CategoryRouteContext) {
  const { categoryId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { event: { select: { organizerId: true, eventType: true } }, _count: { select: { registrations: true } } },
  });

  if (!category) {
    return notFound("Category");
  }

  if (category.event.organizerId !== user.id) {
    return forbidden();
  }

  const parsed = updateCategorySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid category data");
  }

  const nextFormat = parsed.data.format ?? category.format;
  const roster = defaultRosterSize(nextFormat);
  const minMembers = parsed.data.minMembers ?? (parsed.data.format ? roster.min : category.minMembers);
  const maxMembers = parsed.data.maxMembers ?? (parsed.data.format ? roster.max : category.maxMembers);

  if (minMembers > maxMembers) {
    return badRequest("Minimum members cannot exceed maximum members");
  }
  if (nextFormat && !["GROUP", "CREW_VS_CREW"].includes(nextFormat) && (minMembers !== roster.min || maxMembers !== roster.max)) {
    return badRequest(`${nextFormat} entries require exactly ${roster.min} member${roster.min === 1 ? "" : "s"}`);
  }

  if (parsed.data.format && isCompetitionType(category.event.eventType) && !COMPETITION_FORMATS.includes(parsed.data.format)) {
    return badRequest("Competition categories use Solo, Duo, or Group formats");
  }
  if (parsed.data.format && isBattleType(category.event.eventType) && !BATTLE_FORMATS.includes(parsed.data.format)) {
    return badRequest("Underground battle categories use 1v1, 2v2, 3v3, or Crew vs crew formats");
  }
  if (parsed.data.format && isWorkshopType(category.event.eventType) && parsed.data.format !== "SOLO") {
    return badRequest("Workshop sessions use the Solo format");
  }

  if (category._count.registrations > 0 && parsed.data.format && parsed.data.format !== category.format) {
    return conflict("The category format cannot change after registration begins");
  }
  if (category._count.registrations > 0 && ((parsed.data.minMembers !== undefined && parsed.data.minMembers !== category.minMembers) || (parsed.data.maxMembers !== undefined && parsed.data.maxMembers !== category.maxMembers))) {
    return conflict("Roster limits cannot change after registration begins");
  }

  try {
    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...parsed.data,
        minMembers,
        maxMembers,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("This event already has a category with that name");
    }

    console.error(error);
    return serverError();
  }
}

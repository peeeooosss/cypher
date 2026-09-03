import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, conflict, forbidden, isUniqueConstraintError, notFound, serverError, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { BATTLE_FORMATS, COMPETITION_FORMATS, defaultRosterSize, isCompetitionType, isBattleType, isWorkshopType } from "@/lib/event-types";
import { prisma } from "@/lib/prisma";
import { CategoryFormat } from "@/generated/prisma/enums";

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  format: z.nativeEnum(CategoryFormat).optional(),
  maxCompetitors: z.number().int().positive().max(256).nullable().optional(),
  minMembers: z.number().int().positive().max(20).optional(),
  maxMembers: z.number().int().positive().max(20).optional(),
  entryFee: z.number().int().min(0).max(10000000).nullable().optional(),
  entryCurrency: z.string().trim().min(1).max(8).default("INR"),
  prizeAmount: z.number().int().min(0).max(100000000).nullable().optional(),
});

type CategoryRouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_: Request, { params }: CategoryRouteContext) {
  try {
    const { eventId } = await params;
    const categories = await prisma.category.findMany({
      where: { eventId },
      include: { _count: { select: { registrations: true, matches: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: Request, { params }: CategoryRouteContext) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  if (!(await getEventForOwner(eventId, user.id))) {
    return notFound("Event");
  }

  const parsed = categorySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid category data");
  }

  try {
    const { prizeAmount, ...categoryData } = parsed.data;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { eventType: true },
    });

    const format = categoryData.format ?? (isBattleType(event?.eventType) ? CategoryFormat.BATTLE_1V1 : CategoryFormat.SOLO);
    if (isCompetitionType(event?.eventType) && !COMPETITION_FORMATS.includes(format)) {
      return badRequest("Competition categories use Solo, Duo, or Group formats");
    }
    if (isBattleType(event?.eventType) && !BATTLE_FORMATS.includes(format)) {
      return badRequest("Underground battle categories use 1v1, 2v2, 3v3, or Crew vs crew formats");
    }
    if (isWorkshopType(event?.eventType) && format !== CategoryFormat.SOLO) {
      return badRequest("Workshop sessions use the Solo format");
    }
    const roster = defaultRosterSize(format);
    const minMembers = categoryData.minMembers ?? roster.min;
    const maxMembers = categoryData.maxMembers ?? roster.max;

    if (minMembers > maxMembers) {
      return badRequest("Minimum members cannot exceed maximum members");
    }
    if (format !== CategoryFormat.GROUP && format !== CategoryFormat.CREW_VS_CREW && (minMembers !== roster.min || maxMembers !== roster.max)) {
      return badRequest(`${format} entries require exactly ${roster.min} member${roster.min === 1 ? "" : "s"}`);
    }

    const category = await prisma.$transaction(async (transaction) => {
      const created = await transaction.category.create({
        data: {
          ...categoryData,
          format,
          minMembers,
          maxMembers,
          event: { connect: { id: eventId } },
        },
      });

      if (isCompetitionType(event?.eventType)) {
        await transaction.roundFormat.createMany({
          data: [
            { categoryId: created.id, order: 1, type: "QUALIFIER", label: "Qualifiers", phaseStatus: "PENDING" },
            { categoryId: created.id, order: 2, type: "QUALIFIER", label: "Finals", phaseStatus: "PENDING" },
          ],
        });
      }

      if (prizeAmount && prizeAmount > 0) {
        await transaction.prizePool.upsert({
          where: { categoryId: created.id },
          create: {
            categoryId: created.id,
            totalAmount: prizeAmount,
            currency: parsed.data.entryCurrency ?? "INR",
            distribution: [
              { rank: 1, label: "1st place", percentage: 60 },
              { rank: 2, label: "2nd place", percentage: 30 },
              { rank: 3, label: "3rd place", percentage: 10 },
            ],
          },
          update: {},
        });
      }

      return created;
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("This event already has a category with that name");
    }

    console.error(error);
    return serverError();
  }
}

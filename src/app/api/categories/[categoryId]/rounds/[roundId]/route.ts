import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isCompetitionType } from "@/lib/event-types";

type Context = { params: Promise<{ categoryId: string; roundId: string }> };

const updateRoundSchema = z.object({
  type: z.nativeEnum(
    {
      CYPHER: "CYPHER",
      QUALIFIER: "QUALIFIER",
      BATTLE_1V1: "BATTLE_1V1",
      BATTLE_2V2: "BATTLE_2V2",
      BATTLE_3V3: "BATTLE_3V3",
      BATTLE_4V4: "BATTLE_4V4",
      CREW_VS_CREW: "CREW_VS_CREW",
      SEVEN_TO_SMOKE: "SEVEN_TO_SMOKE",
      FINAL: "FINAL",
    } as const,
  ).optional(),
  label: z.string().optional().nullable(),
  roundCount: z.number().int().min(1).optional(),
  roundDuration: z.number().int().optional().nullable(),
  advanceCount: z.number().int().optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { categoryId, roundId } = await context.params;

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { event: { select: { organizerId: true, eventType: true } } },
    });
    if (!category) return notFound("Category");
    if (category.event.organizerId !== user.id) return forbidden();

    const round = await prisma.roundFormat.findUnique({
      where: { id: roundId },
    });
    if (!round || round.categoryId !== categoryId) return notFound("RoundFormat");

    const body = updateRoundSchema.safeParse(await request.json());
    if (!body.success) return badRequest(body.error.issues[0].message);

    if (
      body.data.type &&
      isCompetitionType(category.event.eventType) &&
      ["BATTLE_1V1", "BATTLE_2V2", "BATTLE_3V3", "BATTLE_4V4", "CREW_VS_CREW", "FINAL"].includes(body.data.type)
    ) {
      return badRequest("Competition events use single-point scoring phases, not battle phases");
    }

    const updated = await prisma.roundFormat.update({
      where: { id: roundId },
      data: body.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { categoryId, roundId } = await context.params;

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { event: { select: { organizerId: true } } },
    });
    if (!category) return notFound("Category");
    if (category.event.organizerId !== user.id) return forbidden();

    const round = await prisma.roundFormat.findUnique({ where: { id: roundId } });
    if (!round || round.categoryId !== categoryId) return notFound("RoundFormat");
    if (round.phaseStatus !== "PENDING") return badRequest("Only pending phases can be deleted");

    await prisma.roundFormat.delete({ where: { id: roundId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

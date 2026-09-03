import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { clearCategoryCompetitionData, restoreCategoryRegistrations } from "@/lib/category-phase";
import { BATTLE_PHASE_TYPES, generateBracket, BracketError } from "@/lib/bracket";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";

type Context = { params: Promise<{ categoryId: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const { categoryId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        event: { select: { organizerId: true, id: true } },
        rounds: { orderBy: { order: "asc" } },
      },
    });

    if (!category) return notFound("Category");
    if (category.event.organizerId !== user.id) return forbidden();

    const currentPhase = category.currentPhaseOrder != null
      ? category.rounds.find((round) => round.order === category.currentPhaseOrder)
      : category.rounds.every((round) => round.phaseStatus === "COMPLETE")
        ? [...category.rounds].sort((a, b) => b.order - a.order)[0]
        : undefined;
    if (!currentPhase) return badRequest("There is no active phase to rewind");

    const previousPhase = [...category.rounds]
      .filter((round) => round.order < currentPhase.order)
      .sort((a, b) => b.order - a.order)[0];
    if (!previousPhase) return badRequest("This is already the first phase");

    await prisma.$transaction(async (transaction) => {
      await clearCategoryCompetitionData(transaction, categoryId);
      await restoreCategoryRegistrations(transaction, categoryId);
      await transaction.roundFormat.update({
        where: { id: currentPhase.id },
        data: { phaseStatus: "PENDING" },
      });
      await transaction.roundFormat.update({
        where: { id: previousPhase.id },
        data: { phaseStatus: "ACTIVE" },
      });
      await transaction.category.update({
        where: { id: categoryId },
        data: { currentPhaseOrder: previousPhase.order },
      });
    });

    let matches: unknown[] = [];
    if (BATTLE_PHASE_TYPES.includes(previousPhase.type as (typeof BATTLE_PHASE_TYPES)[number])) {
      try {
        matches = await generateBracket(categoryId, user.id, previousPhase.id);
      } catch (error) {
        if (error instanceof BracketError) return badRequest(error.message);
        throw error;
      }
    }

    await emitToSocket(category.event.id, "phase:activated", {
      phaseId: previousPhase.id,
      phaseOrder: previousPhase.order,
      type: previousPhase.type,
      label: previousPhase.label,
      categoryId,
    });

    return NextResponse.json({ previousPhase, matches });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

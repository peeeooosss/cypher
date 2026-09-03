import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
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
        event: { select: { organizerId: true } },
        rounds: { orderBy: { order: "asc" } },
      },
    });

    if (!category) return notFound("Category");
    if (category.event.organizerId !== user.id) return forbidden();

    const currentPhase = category.rounds.find(
      (round) => round.order === category.currentPhaseOrder && round.phaseStatus === "ACTIVE",
    );
    if (!currentPhase) return badRequest("No active phase to advance");

    const isBattlePhase = BATTLE_PHASE_TYPES.includes(
      currentPhase.type as (typeof BATTLE_PHASE_TYPES)[number],
    );
    let winners: string[] = [];

    if (isBattlePhase) {
      const matches = await prisma.battleMatch.findMany({
        where: { categoryId, roundFormatId: currentPhase.id },
        select: { status: true, winnerId: true, competitorAId: true, competitorBId: true },
        orderBy: { position: "asc" },
      });

      if (matches.length === 0) return badRequest("No battle matches have been generated for this phase");
      if (matches.some((match) => match.status !== "COMPLETE" || !match.winnerId)) {
        return badRequest("Complete every battle match before advancing");
      }

      winners = [...new Set(matches.map((match) => match.winnerId).filter((id): id is string => Boolean(id)))];

      if (currentPhase.advanceCount != null && winners.length !== currentPhase.advanceCount) {
        return badRequest(`This phase must advance exactly ${currentPhase.advanceCount} entries`);
      }
    } else if (currentPhase.advanceCount != null) {
      const confirmedCount = await prisma.registration.count({
        where: { categoryId, status: "CONFIRMED" },
      });
      if (confirmedCount !== currentPhase.advanceCount) {
        return badRequest(`Select exactly ${currentPhase.advanceCount} entries before advancing`);
      }
    }

    const nextPhase = category.rounds.find(
      (round) => round.order > currentPhase.order && round.phaseStatus !== "COMPLETE" && round.phaseStatus !== "ACTIVE",
    );

    await prisma.$transaction(async (transaction) => {
      if (isBattlePhase) {
        const confirmedEntries = await transaction.registration.findMany({
          where: { categoryId, status: "CONFIRMED" },
          select: { id: true },
        });
        const loserIds = confirmedEntries
          .map((entry) => entry.id)
          .filter((id) => !winners.includes(id));
        if (loserIds.length > 0) {
          await transaction.registration.updateMany({
            where: { categoryId, id: { in: loserIds } },
            data: { status: "WITHDRAWN" },
          });
        }
      }

      await transaction.roundFormat.update({
        where: { id: currentPhase.id },
        data: { phaseStatus: "COMPLETE" },
      });

      if (nextPhase) {
        await transaction.category.update({
          where: { id: categoryId },
          data: { currentPhaseOrder: nextPhase.order },
        });
        await transaction.roundFormat.update({
          where: { id: nextPhase.id },
          data: { phaseStatus: "ACTIVE" },
        });
      } else {
        await transaction.category.update({
          where: { id: categoryId },
          data: { currentPhaseOrder: null },
        });
      }
    });

    let matches: unknown[] = [];
    if (nextPhase && BATTLE_PHASE_TYPES.includes(nextPhase.type as (typeof BATTLE_PHASE_TYPES)[number])) {
      try {
        matches = await generateBracket(categoryId, user.id, nextPhase.id);
      } catch (error) {
        if (error instanceof BracketError) return badRequest(error.message);
        throw error;
      }
    }

    await emitToSocket(category.eventId, "phase:completed", {
      phaseId: currentPhase.id,
      phaseOrder: currentPhase.order,
      categoryId,
    });

    if (nextPhase) {
      await emitToSocket(category.eventId, "phase:activated", {
        phaseId: nextPhase.id,
        phaseOrder: nextPhase.order,
        type: nextPhase.type,
        label: nextPhase.label,
        categoryId,
      });
      if (matches.length > 0) {
        await emitToSocket(category.eventId, "bracket:generated", {
          matches,
          categoryId,
        });
      }
    }

    return NextResponse.json({ previousPhase: currentPhase, nextPhase: nextPhase ?? null, matches, winners });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

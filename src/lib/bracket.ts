import { prisma } from "@/lib/prisma";

export class BracketError extends Error {}

export const BATTLE_PHASE_TYPES = [
  "BATTLE_1V1",
  "BATTLE_2V2",
  "BATTLE_3V3",
  "BATTLE_4V4",
  "CREW_VS_CREW",
  "FINAL",
] as const;

export async function generateBracket(categoryId: string, organizerId: string, roundFormatId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, event: { organizerId } },
    include: {
      rounds: { where: { id: roundFormatId } },
      registrations: {
        where: { status: "CONFIRMED" },
        orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
        include: { members: { where: { status: "ACCEPTED" }, select: { id: true } } },
      },
    },
  });

  if (!category) {
    throw new BracketError("Category not found");
  }

  const phase = category.rounds[0];
  if (!phase) {
    throw new BracketError("Phase not found for this category");
  }

  if (phase.phaseStatus !== "ACTIVE") {
    throw new BracketError("This phase is not active");
  }

  if (!BATTLE_PHASE_TYPES.includes(phase.type as (typeof BATTLE_PHASE_TYPES)[number])) {
    throw new BracketError("This phase does not use a battle bracket");
  }

  if (category.registrations.some((registration) => registration.members.length < category.minMembers || registration.members.length > category.maxMembers)) {
    throw new BracketError("Every confirmed entry must have a complete roster");
  }

  if (category.registrations.length < 2) {
    throw new BracketError("At least two confirmed registrations are required");
  }

  const existingMatches = await prisma.battleMatch.count({ where: { roundFormatId } });

  if (existingMatches > 0) {
    throw new BracketError("This phase already has a bracket");
  }

  return prisma.$transaction(async (transaction) => {
    for (let index = 0; index < category.registrations.length; index += 2) {
      const competitorA = category.registrations[index];
      const competitorB = category.registrations[index + 1];
      const isBye = !competitorB;

      await transaction.battleMatch.create({
        data: {
          eventId: category.eventId,
          categoryId,
          roundFormatId,
          round: 1,
          position: index / 2 + 1,
          competitorAId: competitorA.id,
          competitorBId: competitorB?.id,
          status: isBye ? "COMPLETE" : "PENDING",
          winnerId: isBye ? competitorA.id : undefined,
          completedAt: isBye ? new Date() : undefined,
        },
      });
    }

    return transaction.battleMatch.findMany({
      where: { roundFormatId },
      orderBy: [{ round: "asc" }, { position: "asc" }],
    });
  });
}

export async function completeMatch(matchId: string, winnerId: string, organizerId: string) {
  return prisma.$transaction(async (transaction) => {
    const match = await transaction.battleMatch.findFirst({
      where: { id: matchId, event: { organizerId } },
      include: { roundFormat: true },
    });

    if (!match || !match.roundFormat) {
      throw new BracketError("Match not found");
    }

    if (match.roundFormat.phaseStatus !== "ACTIVE") {
      throw new BracketError("This phase is not active");
    }

    if (match.status === "COMPLETE") {
      throw new BracketError("This match is already complete");
    }

    if (match.competitorAId !== winnerId && match.competitorBId !== winnerId) {
      throw new BracketError("Winner must be one of the match competitors");
    }

    return transaction.battleMatch.update({
      where: { id: matchId },
      data: { status: "COMPLETE", winnerId, completedAt: new Date() },
    });
  });
}

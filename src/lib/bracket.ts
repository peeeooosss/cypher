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

export async function generateBracket(
  categoryId: string,
  organizerId: string,
  roundFormatId: string,
  opts?: { matchSize?: number },
) {
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

  const matchSize = opts?.matchSize === 3 ? 3 : 2;

  return prisma.$transaction(async (transaction) => {
    for (let index = 0; index < category.registrations.length; index += matchSize) {
      const lane = category.registrations.slice(index, index + matchSize);
      const [competitorA, competitorB, competitorC] = lane;
      const isBye = lane.length === 1;

      await transaction.battleMatch.create({
        data: {
          eventId: category.eventId,
          categoryId,
          roundFormatId,
          round: 1,
          position: index / matchSize + 1,
          matchSize,
          competitorAId: competitorA.id,
          competitorBId: competitorB?.id,
          competitorCId: competitorC?.id,
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

export async function completeMatch(
  matchId: string,
  winnerId: string,
  organizerId: string,
  opts?: { runnerUpId?: string | null },
) {
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

    const laneIds = [match.competitorAId, match.competitorBId, match.competitorCId].filter(
      (id): id is string => Boolean(id),
    );

    if (!laneIds.includes(winnerId)) {
      throw new BracketError("Winner must be one of the match competitors");
    }

    const runnerUpId = opts?.runnerUpId ?? null;
    if (runnerUpId != null) {
      if (match.matchSize < 3 || (match.winnerCount ?? 1) < 2) {
        throw new BracketError("Runner-up needs a 3-way match that advances 2 winners");
      }
      if (!laneIds.includes(runnerUpId)) {
        throw new BracketError("Runner-up must be one of the match competitors");
      }
      if (runnerUpId === winnerId) {
        throw new BracketError("Winner and runner-up must be different competitors");
      }
    }

    if (match.status === "COMPLETE" && match.winnerLocked) {
      throw new BracketError("Winner is locked. Unlock it to change the winner.");
    }

    return transaction.battleMatch.update({
      where: { id: matchId },
      data: {
        status: "COMPLETE",
        winnerId,
        runnerUpId,
        completedAt: new Date(),
        winnerLocked: true,
      },
    });
  });
}

/** Lanes of a match in lane order: red, blue, then green for 3-way battles. */
export function matchLaneIds(match: {
  competitorAId: string | null;
  competitorBId: string | null;
  competitorCId?: string | null;
}): string[] {
  return [match.competitorAId, match.competitorBId, match.competitorCId ?? null].filter(
    (id): id is string => Boolean(id),
  );
}

export function winnerCornerFor(match: {
  competitorAId: string | null;
  competitorBId: string | null;
  competitorCId?: string | null;
  winnerId: string | null;
}): "red" | "blue" | "green" | null {
  if (!match.winnerId) return null;
  if (match.winnerId === match.competitorAId) return "red";
  if (match.winnerId === match.competitorBId) return "blue";
  if (match.winnerId === (match.competitorCId ?? null)) return "green";
  return null;
}

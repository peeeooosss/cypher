import { prisma } from "@/lib/prisma";

export class BracketError extends Error {}

export async function generateBracket(categoryId: string, organizerId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, event: { organizerId } },
    include: {
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

  if (category.registrations.some((registration) => registration.members.length < category.minMembers || registration.members.length > category.maxMembers)) {
    throw new BracketError("Every confirmed entry must have a complete roster");
  }

  if (category.registrations.length < 2) {
    throw new BracketError("At least two confirmed registrations are required");
  }

  const existingMatches = await prisma.battleMatch.count({ where: { categoryId } });

  if (existingMatches > 0) {
    throw new BracketError("This category already has a bracket");
  }

  const bracketSize = 2 ** Math.ceil(Math.log2(category.registrations.length));
  const roundCount = Math.log2(bracketSize);

  return prisma.$transaction(async (transaction) => {
    const matches = new Map<string, { id: string; competitorAId: string | null; competitorBId: string | null }>();

    for (let round = 1; round <= roundCount; round += 1) {
      const matchCount = bracketSize / 2 ** round;

      for (let position = 1; position <= matchCount; position += 1) {
        const registrationIndex = (position - 1) * 2;
        const match = await transaction.battleMatch.create({
          data: {
            eventId: category.eventId,
            categoryId,
            round,
            position,
            competitorAId: round === 1 ? category.registrations[registrationIndex]?.id : undefined,
            competitorBId: round === 1 ? category.registrations[registrationIndex + 1]?.id : undefined,
          },
        });

        matches.set(`${round}:${position}`, {
          id: match.id,
          competitorAId: match.competitorAId,
          competitorBId: match.competitorBId,
        });
      }
    }

    for (let round = 1; round < roundCount; round += 1) {
      const matchCount = bracketSize / 2 ** round;

      for (let position = 1; position <= matchCount; position += 1) {
        const match = matches.get(`${round}:${position}`);
        const nextMatch = matches.get(`${round + 1}:${Math.ceil(position / 2)}`);

        if (match && nextMatch) {
          await transaction.battleMatch.update({
            where: { id: match.id },
            data: { nextMatchId: nextMatch.id },
          });
        }
      }
    }

    let progressed = true;

    while (progressed) {
      progressed = false;
      const pendingMatches = await transaction.battleMatch.findMany({
        where: { categoryId, status: "PENDING" },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      });

      for (const match of pendingMatches) {
        const competitors = [match.competitorAId, match.competitorBId].filter(Boolean);

        if (competitors.length !== 1) {
          continue;
        }

        const winnerId = competitors[0];
        await transaction.battleMatch.update({
          where: { id: match.id },
          data: { status: "COMPLETE", winnerId, completedAt: new Date() },
        });

        if (match.nextMatchId) {
          const nextMatch = await transaction.battleMatch.findUnique({ where: { id: match.nextMatchId } });

          if (nextMatch && !nextMatch.competitorAId) {
            await transaction.battleMatch.update({ where: { id: nextMatch.id }, data: { competitorAId: winnerId } });
          } else if (nextMatch && !nextMatch.competitorBId) {
            await transaction.battleMatch.update({ where: { id: nextMatch.id }, data: { competitorBId: winnerId } });
          }
        }

        progressed = true;
      }
    }

    return transaction.battleMatch.findMany({
      where: { categoryId },
      orderBy: [{ round: "asc" }, { position: "asc" }],
    });
  });
}

export async function completeMatch(matchId: string, winnerId: string, organizerId: string) {
  return prisma.$transaction(async (transaction) => {
    const match = await transaction.battleMatch.findFirst({
      where: { id: matchId, event: { organizerId } },
    });

    if (!match) {
      throw new BracketError("Match not found");
    }

    if (match.competitorAId !== winnerId && match.competitorBId !== winnerId) {
      throw new BracketError("Winner must be one of the match competitors");
    }

    const completed = await transaction.battleMatch.update({
      where: { id: matchId },
      data: { status: "COMPLETE", winnerId, completedAt: new Date() },
    });

    if (match.nextMatchId) {
      const nextMatch = await transaction.battleMatch.findUnique({ where: { id: match.nextMatchId } });

      if (nextMatch && !nextMatch.competitorAId) {
        await transaction.battleMatch.update({ where: { id: nextMatch.id }, data: { competitorAId: winnerId } });
      } else if (nextMatch && !nextMatch.competitorBId) {
        await transaction.battleMatch.update({ where: { id: nextMatch.id }, data: { competitorBId: winnerId } });
      }
    }

    return completed;
  });
}

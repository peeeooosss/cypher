import { prisma } from "@/lib/prisma";
import type { MatchLiveData } from "@/lib/socket/types";

export async function getMatchState(eventId: string) {
  return prisma.battleMatch.findMany({
    where: { eventId },
    include: {
      competitorA: { include: { user: { select: { id: true, name: true } } } },
      competitorB: { include: { user: { select: { id: true, name: true } } } },
      winner: { include: { user: { select: { id: true, name: true } } } },
      scores: { include: { judgeSlot: { select: { name: true, code: true } } } },
    },
    orderBy: [{ round: "asc" }, { position: "asc" }],
  });
}

export async function getLiveMatchPayload(matchId: string): Promise<MatchLiveData | null> {
  const match = await prisma.battleMatch.findUnique({
    where: { id: matchId },
    include: {
      competitorA: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
      competitorB: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
      category: { include: { rounds: { orderBy: { order: "asc" } } } },
      battleTimer: true,
    },
  });
  if (!match) return null;

  const activeRound = match.category.rounds.find((r) => r.order === match.round);
  return {
    matchId: match.id,
    round: match.round,
    position: match.position,
    red: {
      id: match.competitorAId ?? "",
      name: match.competitorA?.user.name ?? "TBD",
      crew: match.competitorA?.crew ?? null,
      seed: match.competitorA?.seed ?? null,
      avatar: match.competitorA?.user.avatarUrl ?? null,
    },
    blue: {
      id: match.competitorBId ?? "",
      name: match.competitorB?.user.name ?? "TBD",
      crew: match.competitorB?.crew ?? null,
      seed: match.competitorB?.seed ?? null,
      avatar: match.competitorB?.user.avatarUrl ?? null,
    },
    timeLimitMs: match.battleTimer?.timeLimitMs ?? activeRound?.timeLimitMs ?? 60000,
    status: "LIVE" as const,
  };
}

export async function getMatchAggregate(matchId: string) {
  const totals = await prisma.matchScore.aggregate({
    where: { matchId },
    _sum: { scoreA: true, scoreB: true },
    _count: true,
  });
  return {
    scoreRed: totals._sum.scoreA ?? 0,
    scoreBlue: totals._sum.scoreB ?? 0,
    judgeCount: totals._count,
  };
}

export async function getMatchDecisionAggregate(matchId: string) {
  const scores = await prisma.matchScore.findMany({
    where: { matchId },
    select: { winnerCorner: true },
  });
  const redVotes = scores.filter((s) => s.winnerCorner === "RED").length;
  const blueVotes = scores.filter((s) => s.winnerCorner === "BLUE").length;
  return { scoreRed: redVotes, scoreBlue: blueVotes, judgeCount: scores.length };
}

export async function getDefaultTimeLimit(categoryId: string, roundOrder: number): Promise<number> {
  const round = await prisma.roundFormat.findUnique({
    where: { categoryId_order: { categoryId, order: roundOrder } },
    select: { timeLimitMs: true },
  });
  return round?.timeLimitMs ?? 60000;
}

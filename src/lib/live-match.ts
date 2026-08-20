import { prisma } from "@/lib/prisma";
import type { MatchLiveData } from "@/lib/socket/types";

export async function getMatchState(eventId: string) {
  return prisma.battleMatch.findMany({
    where: { eventId, roundFormat: { phaseStatus: "ACTIVE" } },
    include: {
      competitorA: { include: { user: { select: { id: true, name: true } }, members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } } } },
      competitorB: { include: { user: { select: { id: true, name: true } }, members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } } } },
      winner: { include: { user: { select: { id: true, name: true } }, members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } } } },
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
        include: { user: { select: { id: true, name: true, avatarUrl: true } }, members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } } },
      },
      competitorB: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } }, members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } } },
      },
      roundFormat: true,
      battleTimer: true,
    },
  });
  if (!match) return null;

  return {
    matchId: match.id,
    round: match.round,
    position: match.position,
    red: {
      id: match.competitorAId ?? "",
       name: match.competitorA?.teamName ?? match.competitorA?.user.name ?? "TBD",
      crew: match.competitorA?.crew ?? null,
      seed: match.competitorA?.seed ?? null,
       avatar: match.competitorA?.user.avatarUrl ?? null,
       members: match.competitorA?.members.map((member) => member.user.name ?? member.user.username ?? "Unnamed"),
    },
    blue: {
      id: match.competitorBId ?? "",
       name: match.competitorB?.teamName ?? match.competitorB?.user.name ?? "TBD",
      crew: match.competitorB?.crew ?? null,
      seed: match.competitorB?.seed ?? null,
       avatar: match.competitorB?.user.avatarUrl ?? null,
       members: match.competitorB?.members.map((member) => member.user.name ?? member.user.username ?? "Unnamed"),
    },
     timeLimitMs: match.battleTimer?.timeLimitMs ?? match.roundFormat?.timeLimitMs ?? 60000,
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

export async function getDefaultTimeLimit(roundFormatId: string | null): Promise<number> {
  if (!roundFormatId) return 60000;
  const round = await prisma.roundFormat.findUnique({
    where: { id: roundFormatId },
    select: { timeLimitMs: true },
  });
  return round?.timeLimitMs ?? 60000;
}

import { NextResponse } from "next/server";
import { notFound } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ eventId: string }> };

export async function GET(_: Request, { params }: Context) {
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      status: true,
      categories: {
        select: {
          id: true,
          name: true,
          currentPhaseOrder: true,
          rounds: {
            select: {
              id: true,
              order: true,
              type: true,
              label: true,
              phaseStatus: true,
            },
            orderBy: { order: "asc" },
          },
          registrations: {
            where: { status: "CONFIRMED" },
            select: {
              id: true,
              seed: true,
              crew: true,
              user: { select: { name: true } },
              dancerScores: { select: { score: true } },
              matchesAsA: { select: { scoreA: true, status: true } },
              matchesAsB: { select: { scoreB: true, status: true } },
            },
          },
        },
      },
    },
  });

  if (!event) return notFound("Event");

  const data = {
    eventId: event.id,
    title: event.title,
    status: event.status,
    categories: event.categories.map((category) => {
      const activeRound = category.rounds.find((r) => r.phaseStatus === "ACTIVE");

      const dancers = category.registrations.map((reg) => {
        const dancerTotal = reg.dancerScores.reduce((s, d) => s + d.score, 0);
        const dancerCount = reg.dancerScores.length;
        const matchScore =
          reg.matchesAsA.filter((m) => m.status === "COMPLETE").reduce((s, m) => s + m.scoreA, 0) +
          reg.matchesAsB.filter((m) => m.status === "COMPLETE").reduce((s, m) => s + m.scoreB, 0);
        const matchCount =
          reg.matchesAsA.filter((m) => m.status === "COMPLETE").length +
          reg.matchesAsB.filter((m) => m.status === "COMPLETE").length;
        const total = dancerTotal + matchScore;
        return {
          registrationId: reg.id,
          name: reg.user.name ?? "Unnamed",
          seed: reg.seed,
          crew: reg.crew,
          dancerTotal,
          matchScore,
          total,
          judgeVotes: dancerCount,
          matches: matchCount,
        };
      });

      dancers.sort((a, b) => b.total - a.total || (a.seed ?? 999) - (b.seed ?? 999));

      return {
        categoryId: category.id,
        name: category.name,
        currentPhaseOrder: category.currentPhaseOrder,
        activeRound: activeRound
          ? { id: activeRound.id, type: activeRound.type, label: activeRound.label }
          : null,
        dancers: dancers.map((d, i) => ({ rank: i + 1, ...d })),
      };
    }),
  };

  return NextResponse.json(data);
}

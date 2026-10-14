import { NextResponse } from "next/server";
import { forbidden, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getStaffSession } from "@/lib/staff-codes";
import { isBattleType } from "@/lib/event-types";

const laneInclude = {
  include: {
    user: { select: { name: true, username: true } },
    members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } },
  },
} as const;

function laneName(reg: { teamName: string | null; user: { name: string | null; username: string | null } } | null): string {
  if (!reg) return "TBD";
  return reg.teamName ?? reg.user.name ?? (reg.user.username ? `@${reg.user.username}` : "Unnamed");
}

export async function GET() {
  try {
    const session = await getStaffSession();
    if (!session) return forbidden();

    const event = await prisma.event.findUnique({
      where: { id: session.eventId },
      select: {
        id: true,
        title: true,
        eventType: true,
        status: true,
        startsAt: true,
        venue: true,
        city: true,
        organizerId: true,
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
                advanceCount: true,
                matchSize: true,
                phaseStatus: true,
              },
              orderBy: { order: "asc" },
            },
          },
          orderBy: { name: "asc" },
        },
      },
    });
    if (!event) return forbidden();

    const activePhaseByCategory = new Map(
      event.categories.map((c) => [
        c.id,
        c.rounds.find((r) => r.order === c.currentPhaseOrder && r.phaseStatus === "ACTIVE") ?? null,
      ]),
    );
    const activePhaseIds = [...activePhaseByCategory.values()].map((r) => r?.id).filter((id): id is string => Boolean(id));

    const matches = activePhaseIds.length
      ? await prisma.battleMatch.findMany({
          where: { eventId: event.id, roundFormatId: { in: activePhaseIds } },
          include: {
            competitorA: laneInclude,
            competitorB: laneInclude,
            competitorC: laneInclude,
            scores: { select: { winnerCorner: true } },
          },
          orderBy: [{ round: "asc" }, { position: "asc" }],
        })
      : [];

    return NextResponse.json({
      eventTitle: event.title,
      eventStatus: event.status,
      portal: isBattleType(event.eventType) ? "MC Portal" : "Host Portal",
      label: session.label,
      role: session.role,
      categories: event.categories.map((c) => {
        const active = activePhaseByCategory.get(c.id) ?? null;
        return {
          id: c.id,
          name: c.name,
          currentPhaseOrder: c.currentPhaseOrder,
          rounds: c.rounds,
          activePhase: active,
          matches: matches
            .filter((m) => m.categoryId === c.id)
            .map((m) => {
              const redVotes = m.scores.filter((s) => s.winnerCorner === "RED").length;
              const blueVotes = m.scores.filter((s) => s.winnerCorner === "BLUE").length;
              const greenVotes = m.scores.filter((s) => s.winnerCorner === "GREEN").length;
              return {
                id: m.id,
                round: m.round,
                position: m.position,
                status: m.status,
                matchSize: m.matchSize,
                winnerCount: m.winnerCount,
                winnerId: m.winnerId,
                winnerLocked: m.winnerLocked,
                runnerUpId: m.runnerUpId,
                lanes: [
                  { corner: "red", registrationId: m.competitorAId, name: laneName(m.competitorA) },
                  { corner: "blue", registrationId: m.competitorBId, name: laneName(m.competitorB) },
                  ...(m.matchSize >= 3 || m.competitorCId
                    ? [{ corner: "green", registrationId: m.competitorCId, name: laneName(m.competitorC) }]
                    : []),
                ],
                votes: { red: redVotes, blue: blueVotes, green: greenVotes },
              };
            }),
        };
      }),
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

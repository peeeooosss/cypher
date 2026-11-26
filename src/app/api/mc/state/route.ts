import { NextResponse } from "next/server";
import { forbidden, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getStaffSession } from "@/lib/staff-codes";
import { isBattleType } from "@/lib/event-types";

const laneInclude = {
  select: {
    teamName: true,
    crew: true,
    style: true,
    musicFileName: true,
    musicFileUrl: true,
    seed: true,
    user: { select: { name: true, username: true } },
    members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } },
  },
} as const;

type LaneRegistration = {
  teamName: string | null;
  crew: string | null;
  style: string | null;
  musicFileName: string | null;
  musicFileUrl: string | null;
  seed: number | null;
  user: { name: string | null; username: string | null };
} | null;

function laneName(reg: LaneRegistration): string {
  if (!reg) return "TBD";
  return reg.teamName ?? reg.user.name ?? (reg.user.username ? `@${reg.user.username}` : "Unnamed");
}

function lanePayload(corner: string, registrationId: string | null, reg: LaneRegistration) {
  return {
    corner,
    registrationId,
    name: laneName(reg),
    seed: reg?.seed ?? null,
    crew: reg?.crew ?? null,
    style: reg?.style ?? null,
    musicFileName: reg?.musicFileName ?? null,
    musicFileUrl: reg?.musicFileUrl ?? null,
  };
}

type RosterRow = {
  id: string;
  name: string;
  crew: string | null;
  style: string | null;
  musicFileName: string | null;
  musicFileUrl: string | null;
  seed: number | null;
  status: string;
};

/** Seed-ordered roster — unseeded entries sort last, then alphabetically. */
function rosterOf(regs: RosterRow[]): RosterRow[] {
  return [...regs].sort(
    (a, b) =>
      (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER) ||
      a.name.localeCompare(b.name),
  );
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

    const registrations = await prisma.registration.findMany({
      where: { categoryId: { in: event.categories.map((c) => c.id) } },
      select: {
        id: true,
        categoryId: true,
        teamName: true,
        crew: true,
        style: true,
        musicFileName: true,
        musicFileUrl: true,
        seed: true,
        status: true,
        user: { select: { name: true, username: true } },
      },
    });
    const participantsByCategory = new Map<string, RosterRow[]>();
    for (const reg of registrations) {
      const row: RosterRow = {
        id: reg.id,
        name: reg.teamName ?? reg.user.name ?? (reg.user.username ? `@${reg.user.username}` : "Unnamed"),
        crew: reg.crew,
        style: reg.style,
        musicFileName: reg.musicFileName,
        musicFileUrl: reg.musicFileUrl,
        seed: reg.seed,
        status: reg.status,
      };
      const list = participantsByCategory.get(reg.categoryId) ?? [];
      list.push(row);
      participantsByCategory.set(reg.categoryId, list);
    }

    return NextResponse.json({
      eventTitle: event.title,
      eventStatus: event.status,
      eventId: event.id,
      portal: isBattleType(event.eventType) ? "MC Portal" : "Host Portal",
      label: session.label,
      role: session.role,
      categories: event.categories.map((c) => {
        const active = activePhaseByCategory.get(c.id) ?? null;
        const categoryMatches = matches
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
                lanePayload("red", m.competitorAId, m.competitorA),
                lanePayload("blue", m.competitorBId, m.competitorB),
                ...(m.matchSize >= 3 || m.competitorCId
                  ? [lanePayload("green", m.competitorCId, m.competitorC)]
                  : []),
              ],
              votes: { red: redVotes, blue: blueVotes, green: greenVotes },
            };
          });
        const liveIndex = categoryMatches.findIndex((m) => m.status === "LIVE");
        const currentIndex = liveIndex >= 0 ? liveIndex : categoryMatches.findIndex((m) => m.status === "PENDING");
        const currentMatch = currentIndex >= 0 ? categoryMatches[currentIndex] : null;
        const nextMatch =
          currentIndex >= 0
            ? categoryMatches.slice(currentIndex + 1).find((m) => m.status === "PENDING") ?? null
            : null;
        return {
          id: c.id,
          name: c.name,
          currentPhaseOrder: c.currentPhaseOrder,
          rounds: c.rounds,
          activePhase: active,
          participants: rosterOf(participantsByCategory.get(c.id) ?? []),
          matches: categoryMatches,
          currentMatch,
          nextMatch,
        };
      }),
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";
import { getMatchState } from "@/lib/live-match";

type Context = { params: Promise<{ matchId: string }> };

/**
 * Spawn a one-off overtime tiebreak: a fresh PENDING match with the same
 * lanes, appended after the current matches of the phase.
 */
export async function POST(_: Request, { params }: Context) {
  try {
    const { matchId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const match = await prisma.battleMatch.findUnique({
      where: { id: matchId },
      include: { category: { include: { event: { select: { organizerId: true } } } } },
    });
    if (!match) return notFound("Match");
    if (match.category.event.organizerId !== user.id) return forbidden();
    if (!match.roundFormatId) return badRequest("Tiebreaks need a phase match");
    if (!match.competitorAId || !match.competitorBId) return badRequest("Tiebreaks need two lanes");

    const maxPosition = await prisma.battleMatch.aggregate({
      where: { roundFormatId: match.roundFormatId, round: match.round },
      _max: { position: true },
    });

    const created = await prisma.battleMatch.create({
      data: {
        eventId: match.eventId,
        categoryId: match.categoryId,
        roundFormatId: match.roundFormatId,
        round: match.round,
        position: (maxPosition._max.position ?? 0) + 1,
        matchSize: match.matchSize,
        competitorAId: match.competitorAId,
        competitorBId: match.competitorBId,
        competitorCId: match.competitorCId,
        status: "PENDING",
      },
    });

    await prisma.advancementAudit.create({
      data: {
        eventId: match.eventId,
        categoryId: match.categoryId,
        roundFormatId: match.roundFormatId,
        action: "TIEBREAK_CREATED",
        changedBy: user.id,
        reason: `Overtime tiebreak M${created.position} spawned from M${match.position}`,
      },
    });

    const bracket = await getMatchState(match.eventId);
    await emitToSocket(match.eventId, "bracket:generated", { matches: bracket, categoryId: match.categoryId });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

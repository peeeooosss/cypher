import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";
import { getMatchDecisionAggregate, getMatchState } from "@/lib/live-match";

type Context = { params: Promise<{ matchId: string }> };

const bodySchema = z.object({
  judgeSlotId: z.string().min(1),
  reason: z.string().max(280).optional(),
});

/**
 * Void one judge's vote/score on a match (bias, mistake, no-show judge).
 * The correction is written to ScoreAuditLog with the organizer as changer.
 */
export async function POST(request: Request, { params }: Context) {
  try {
    const { matchId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("judgeSlotId is required");

    const match = await prisma.battleMatch.findUnique({
      where: { id: matchId },
      include: { category: { include: { event: { select: { organizerId: true } } } } },
    });
    if (!match) return notFound("Match");
    if (match.category.event.organizerId !== user.id) return forbidden();
    if (match.status === "COMPLETE" && match.winnerLocked) {
      return badRequest("Winner is locked — unlock it before voiding votes");
    }

    const existing = await prisma.matchScore.findUnique({
      where: { matchId_judgeSlotId: { matchId, judgeSlotId: parsed.data.judgeSlotId } },
      include: { judgeSlot: { select: { name: true, code: true } } },
    });
    if (!existing) return notFound("That judge has no vote on this match");

    await prisma.$transaction([
      prisma.matchScore.delete({ where: { id: existing.id } }),
      prisma.scoreAuditLog.create({
        data: {
          matchId,
          judgeSlotId: parsed.data.judgeSlotId,
          oldScoreRed: null,
          oldScoreBlue: null,
          newScoreRed: 0,
          newScoreBlue: 0,
          changedBy: user.id,
          reason: parsed.data.reason ?? `Vote by ${existing.judgeSlot.name ?? existing.judgeSlot.code} voided by organizer`,
        },
      }),
    ]);

    const aggregate = await getMatchDecisionAggregate(matchId);
    await prisma.battleMatch.update({
      where: { id: matchId },
      data: { scoreA: aggregate.scoreRed, scoreB: aggregate.scoreBlue, scoreC: aggregate.scoreGreen },
    });

    const bracket = await getMatchState(match.eventId);
    await emitToSocket(match.eventId, "score_submitted", {
      matchId,
      judgeSlotId: parsed.data.judgeSlotId,
      scoreRed: aggregate.scoreRed,
      scoreBlue: aggregate.scoreBlue,
      scoreGreen: aggregate.scoreGreen,
      aggregateRed: aggregate.scoreRed,
      aggregateBlue: aggregate.scoreBlue,
      aggregateGreen: aggregate.scoreGreen,
      judgeCount: aggregate.judgeCount,
      winnerCorner: null,
    });
    await emitToSocket(match.eventId, "bracket:generated", { matches: bracket, categoryId: match.categoryId });

    return NextResponse.json({ ok: true, aggregate });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

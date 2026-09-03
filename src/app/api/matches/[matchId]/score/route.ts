import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFound, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";
import { getMatchAggregate } from "@/lib/live-match";

type Context = {
  params: Promise<{ matchId: string }>;
};

const scoreSchema = z.object({
  scoreA: z.number().int().min(0).max(10),
  scoreB: z.number().int().min(0).max(10),
  judgeCode: z.string().min(1),
  feedback: z.string().optional(),
});

export async function POST(request: Request, { params }: Context) {
  try {
    const { matchId } = await params;

    const body = await request.json().catch(() => null);
    const parsed = scoreSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid score submission");
    }

    const { scoreA, scoreB, judgeCode, feedback } = parsed.data;

    const slot = await prisma.judgeSlot.findUnique({ where: { code: judgeCode } });

    if (!slot) {
      return notFound("Invalid judge code");
    }

    if (!slot.isActive) {
      return badRequest("Judge slot is not active");
    }

    await prisma.matchScore.upsert({
      where: { matchId_judgeSlotId: { matchId, judgeSlotId: slot.id } },
      update: { scoreA, scoreB, feedback },
      create: { matchId, judgeSlotId: slot.id, scoreA, scoreB, feedback },
    });

    const totals = await prisma.matchScore.aggregate({
      where: { matchId },
      _sum: { scoreA: true, scoreB: true },
    });

    const updated = await prisma.battleMatch.update({
      where: { id: matchId },
      data: {
        status: "LIVE",
        scoreA: totals._sum.scoreA ?? 0,
        scoreB: totals._sum.scoreB ?? 0,
      },
      include: {
        competitorA: { include: { user: { select: { name: true } } } },
        competitorB: { include: { user: { select: { name: true } } } },
        scores: true,
      },
    });

    const aggregate = await getMatchAggregate(matchId);
    await emitToSocket(slot.eventId, "score_submitted", {
      matchId,
      judgeSlotId: slot.id,
      scoreRed: scoreA,
      scoreBlue: scoreB,
      aggregateRed: aggregate.scoreRed,
      aggregateBlue: aggregate.scoreBlue,
      judgeCount: aggregate.judgeCount,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

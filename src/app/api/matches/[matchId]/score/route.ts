import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFound, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";
import { getMatchAggregate } from "@/lib/live-match";
import { SectionScoresSchema } from "@/lib/socket/types";

type Context = {
  params: Promise<{ matchId: string }>;
};

const scoreSchema = z.object({
  scoreA: z.number().min(0).max(20).optional(),
  scoreB: z.number().min(0).max(20).optional(),
  sectionsA: SectionScoresSchema.optional(),
  sectionsB: SectionScoresSchema.optional(),
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

    const { scoreA, scoreB, sectionsA, sectionsB, judgeCode, feedback } = parsed.data;

    const slot = await prisma.judgeSlot.findUnique({ where: { code: judgeCode } });

    if (!slot) {
      return notFound("Invalid judge code");
    }

    if (!slot.isActive) {
      return badRequest("Judge slot is not active");
    }

    const hasSections = sectionsA != null && sectionsB != null;

    await prisma.matchScore.upsert({
      where: { matchId_judgeSlotId: { matchId, judgeSlotId: slot.id } },
      update: {
        scoreA: scoreA ?? 0,
        scoreB: scoreB ?? 0,
        ...(hasSections
          ? {
              scoreAMusicality: sectionsA!.musicality,
              scoreAFoundation: sectionsA!.foundation,
              scoreAPresentation: sectionsA!.presentation,
              scoreAExecution: sectionsA!.execution,
              scoreBMusicality: sectionsB!.musicality,
              scoreBFoundation: sectionsB!.foundation,
              scoreBPresentation: sectionsB!.presentation,
              scoreBExecution: sectionsB!.execution,
            }
          : {}),
        feedback,
      },
      create: {
        matchId,
        judgeSlotId: slot.id,
        scoreA: scoreA ?? 0,
        scoreB: scoreB ?? 0,
        ...(hasSections
          ? {
              scoreAMusicality: sectionsA!.musicality,
              scoreAFoundation: sectionsA!.foundation,
              scoreAPresentation: sectionsA!.presentation,
              scoreAExecution: sectionsA!.execution,
              scoreBMusicality: sectionsB!.musicality,
              scoreBFoundation: sectionsB!.foundation,
              scoreBPresentation: sectionsB!.presentation,
              scoreBExecution: sectionsB!.execution,
            }
          : {}),
        feedback,
      },
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
      scoreRed: scoreA ?? 0,
      scoreBlue: scoreB ?? 0,
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

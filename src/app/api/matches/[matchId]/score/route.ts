import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFound, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";
import { getMatchScoreAggregate } from "@/lib/live-match";
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
  feedbackRed: z.string().max(500).optional(),
  feedbackBlue: z.string().max(500).optional(),
  feedbackTemplateIdRed: z.string().cuid().optional(),
  feedbackTemplateIdBlue: z.string().cuid().optional(),
});

export async function POST(request: Request, { params }: Context) {
  try {
    const { matchId } = await params;

    const body = await request.json().catch(() => null);
    const parsed = scoreSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid score submission");
    }

    const {
      scoreA,
      scoreB,
      sectionsA,
      sectionsB,
      judgeCode,
      feedback,
      feedbackRed: rawFeedbackRed,
      feedbackBlue: rawFeedbackBlue,
      feedbackTemplateIdRed,
      feedbackTemplateIdBlue,
    } = parsed.data;

    const slot = await prisma.judgeSlot.findUnique({
      where: { code: judgeCode.toUpperCase() },
      select: { id: true, isActive: true, categoryId: true, eventId: true },
    });

    if (!slot) {
      return notFound("Invalid judge code");
    }

    if (!slot.isActive) {
      return badRequest("Judge slot is not active");
    }

    const match = await prisma.battleMatch.findUnique({
      where: { id: matchId },
      select: { id: true, categoryId: true, status: true },
    });

    if (!match || match.categoryId !== slot.categoryId) {
      return notFound("Match");
    }
    if (match.status === "LOCKED") {
      return badRequest("Voting is locked for this match");
    }
    if (match.status === "COMPLETE") {
      return badRequest("Match already complete");
    }

    const panelCount = await prisma.judgeAssignment.count({ where: { matchId } });
    if (
      panelCount > 0 &&
      !(await prisma.judgeAssignment.findUnique({
        where: { matchId_judgeSlotId: { matchId, judgeSlotId: slot.id } },
        select: { matchId: true },
      }))
    ) {
      return badRequest("You are not assigned to this match's judging panel");
    }

    async function resolveFeedback(templateId: string | undefined, fallback: string | undefined) {
      if (fallback) return fallback;
      if (!templateId) return null;
      const template = await prisma.feedbackTemplate.findUnique({
        where: { id: templateId },
        select: { text: true },
      });
      return template?.text ?? null;
    }

    const feedbackRed = await resolveFeedback(feedbackTemplateIdRed, rawFeedbackRed);
    const feedbackBlue = await resolveFeedback(feedbackTemplateIdBlue, rawFeedbackBlue);

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
         feedbackRed,
         feedbackBlue,
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
         feedbackRed,
         feedbackBlue,
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

    const aggregate = await getMatchScoreAggregate(matchId);
    await emitToSocket(slot.eventId, "score_submitted", {
      matchId,
      judgeSlotId: slot.id,
      scoreRed: scoreA ?? 0,
      scoreBlue: scoreB ?? 0,
      aggregateRed: aggregate.scoreRed,
      aggregateBlue: aggregate.scoreBlue,
      judgeCount: aggregate.judgeCount,
      redSections: aggregate.redSections,
      blueSections: aggregate.blueSections,
    });

    return NextResponse.json({ ...updated, aggregate });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

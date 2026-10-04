import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFound, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";
import { getMatchDecisionAggregate, getMatchScoreAggregate } from "@/lib/live-match";
import { SectionScoresSchema, type SectionScoresInput } from "@/lib/socket/types";

type Context = {
  params: Promise<{ matchId: string }>;
};

const scoreSchema = z
  .object({
    // Battles are decided by vote. `winnerCorner` is the only field the judge
    // UI sends now; the section/score fields stay for legacy replays.
    winnerCorner: z
      .enum(["RED", "BLUE", "red", "blue"])
      .transform((v) => v.toUpperCase() as "RED" | "BLUE")
      .optional(),
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
  })
  .superRefine((val, ctx) => {
    const hasSections = val.sectionsA != null && val.sectionsB != null;
    const hasScores = val.scoreA != null && val.scoreB != null;
    const hasVote = val.winnerCorner != null;
    if (!hasSections && !hasScores && !hasVote) {
      ctx.addIssue({ code: "custom", message: "Provide a winner vote, sections, or scores" });
    }
  });

async function resolveSlot(judgeCode: string) {
  return prisma.judgeSlot.findUnique({
    where: { code: judgeCode.toUpperCase() },
    select: { id: true, isActive: true, categoryId: true, eventId: true },
  });
}

export async function GET(request: Request, { params }: Context) {
  try {
    const { matchId } = await params;
    const judgeCode = new URL(request.url).searchParams.get("judgeCode");

    if (!judgeCode) {
      return badRequest("judgeCode is required");
    }

    const slot = await resolveSlot(judgeCode);

    if (!slot) {
      return notFound("Invalid judge code");
    }

    const match = await prisma.battleMatch.findUnique({
      where: { id: matchId },
      select: { id: true, categoryId: true, status: true },
    });

    if (!match || match.categoryId !== slot.categoryId) {
      return notFound("Match");
    }

    const [tally, mine] = await Promise.all([
      getMatchDecisionAggregate(matchId),
      prisma.matchScore.findUnique({
        where: { matchId_judgeSlotId: { matchId, judgeSlotId: slot.id } },
        select: { winnerCorner: true, feedbackRed: true, feedbackBlue: true },
      }),
    ]);

    return NextResponse.json({
      status: match.status,
      aggregate: tally,
      myVote: mine?.winnerCorner ?? null,
      myFeedbackRed: mine?.feedbackRed ?? null,
      myFeedbackBlue: mine?.feedbackBlue ?? null,
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { matchId } = await params;

    const body = await request.json().catch(() => null);
    const parsed = scoreSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid score submission");
    }

    const {
      winnerCorner,
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

    const slot = await resolveSlot(judgeCode);

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

    const isVote = winnerCorner != null;
    const hasSections = sectionsA != null && sectionsB != null;

    // A vote stores only the corner plus per-artist feedback. The legacy
    // section columns are left untouched so old replays keep their scores.
    const sectionFields = hasSections
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
      : {};

    await prisma.matchScore.upsert({
      where: { matchId_judgeSlotId: { matchId, judgeSlotId: slot.id } },
      update: {
        winnerCorner: winnerCorner ?? null,
        scoreA: isVote ? 0 : (scoreA ?? 0),
        scoreB: isVote ? 0 : (scoreB ?? 0),
        ...sectionFields,
        feedback,
        feedbackRed,
        feedbackBlue,
      },
      create: {
        matchId,
        judgeSlotId: slot.id,
        winnerCorner: winnerCorner ?? null,
        scoreA: isVote ? 0 : (scoreA ?? 0),
        scoreB: isVote ? 0 : (scoreB ?? 0),
        ...sectionFields,
        feedback,
        feedbackRed,
        feedbackBlue,
      },
    });

    const aggregate = isVote
      ? await getMatchDecisionAggregate(matchId)
      : await getMatchScoreAggregate(matchId);

    const updated = await prisma.battleMatch.update({
      where: { id: matchId },
      data: {
        status: "LIVE",
        scoreA: aggregate.scoreRed,
        scoreB: aggregate.scoreBlue,
      },
      include: {
        competitorA: { include: { user: { select: { name: true } } } },
        competitorB: { include: { user: { select: { name: true } } } },
        scores: true,
      },
    });

    await emitToSocket(slot.eventId, "score_submitted", {
      matchId,
      judgeSlotId: slot.id,
      scoreRed: aggregate.scoreRed,
      scoreBlue: aggregate.scoreBlue,
      aggregateRed: aggregate.scoreRed,
      aggregateBlue: aggregate.scoreBlue,
      judgeCount: aggregate.judgeCount,
      winnerCorner: winnerCorner ?? null,
      ...(hasSections
        ? {
            redSections: (aggregate as { redSections?: SectionScoresInput }).redSections,
            blueSections: (aggregate as { blueSections?: SectionScoresInput }).blueSections,
          }
        : {}),
    });

    return NextResponse.json({ ...updated, aggregate });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

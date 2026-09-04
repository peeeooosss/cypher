import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";
import { sectionTotal } from "@/lib/scoring-sections";
import { SectionScoresSchema } from "@/lib/socket/types";

type Context = { params: Promise<{ code: string }> };

const scoreSchema = z.object({
  registrationId: z.string().min(1),
  score: z.number().min(0).max(20).optional(),
  sections: SectionScoresSchema.optional(),
  feedback: z.string().trim().max(500).optional(),
}).superRefine((val, ctx) => {
  if (val.sections == null && val.score == null) {
    ctx.addIssue({ code: "custom", message: "Provide sections or a score" });
  }
});

export async function GET(_: Request, { params }: Context) {
  try {
    const { code } = await params;
    const slot = await prisma.judgeSlot.findUnique({
      where: { code: code.toUpperCase() },
      select: { id: true, isActive: true },
    });
    if (!slot || !slot.isActive) return notFound("Judge slot");

    const currentPhase = await prisma.roundFormat.findFirst({
      where: {
        category: { judgeSlots: { some: { id: slot.id } } },
        phaseStatus: "ACTIVE",
      },
      select: { id: true },
    });
    if (!currentPhase) return NextResponse.json([]);

    const scores = await prisma.dancerScore.findMany({
      where: { judgeSlotId: slot.id, roundFormatId: currentPhase.id },
      select: { registrationId: true, score: true, feedback: true, roundFormatId: true, musicality: true, foundation: true, presentation: true, execution: true },
    });

    return NextResponse.json(scores);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { code } = await params;
    const slot = await prisma.judgeSlot.findUnique({
      where: { code: code.toUpperCase() },
      select: { id: true, isActive: true, categoryId: true },
    });
    if (!slot) return notFound("Judge slot");
    if (!slot.isActive) return unauthorized();

    const parsed = scoreSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid score");
    }

    const { registrationId, score, feedback, sections } = parsed.data;

    const registration = await prisma.registration.findFirst({
      where: { id: registrationId, categoryId: slot.categoryId, status: "CONFIRMED" },
      select: { id: true },
    });
    if (!registration) return badRequest("Registration not found in this category");

    const currentPhase = await prisma.roundFormat.findFirst({
      where: { categoryId: slot.categoryId, phaseStatus: "ACTIVE" },
      select: { id: true },
    });
    if (!currentPhase) return badRequest("No active phase to score");

    const hasSections = sections != null;
    const total = hasSections
      ? sectionTotal({ MUSICALITY: sections!.musicality, FOUNDATION: sections!.foundation, PRESENTATION: sections!.presentation, EXECUTION: sections!.execution })
      : (score ?? 0);

    const dancerScore = await prisma.dancerScore.upsert({
      where: {
        judgeSlotId_registrationId_roundFormatId: {
          judgeSlotId: slot.id,
          registrationId,
          roundFormatId: currentPhase.id,
        },
      },
      update: {
        score: total,
        musicality: hasSections ? sections!.musicality : undefined,
        foundation: hasSections ? sections!.foundation : undefined,
        presentation: hasSections ? sections!.presentation : undefined,
        execution: hasSections ? sections!.execution : undefined,
        feedback: feedback ?? null,
      },
      create: {
        judgeSlotId: slot.id,
        registrationId,
        roundFormatId: currentPhase.id,
        score: total,
        musicality: hasSections ? sections!.musicality : null,
        foundation: hasSections ? sections!.foundation : null,
        presentation: hasSections ? sections!.presentation : null,
        execution: hasSections ? sections!.execution : null,
        feedback: feedback ?? null,
      },
    });

    const slotWithEvent = await prisma.judgeSlot.findUnique({
      where: { id: slot.id },
      select: { eventId: true },
    });
    if (slotWithEvent) {
      await emitToSocket(slotWithEvent.eventId, "dancer:updated", {
        dancerScore,
        judgeSlotId: slot.id,
        registrationId,
        roundFormatId: currentPhase.id,
        score: total,
        sections: hasSections ? { musicality: sections!.musicality, foundation: sections!.foundation, presentation: sections!.presentation, execution: sections!.execution } : undefined,
      });
    }

    return NextResponse.json(dancerScore);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

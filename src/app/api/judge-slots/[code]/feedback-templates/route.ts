import { NextResponse } from "next/server";
import { notFound, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const DEFAULT_JUDGE_FEEDBACK_TEMPLATES = [
  {
    text: "Excellent musicality — you ride the beat naturally and hit accents with precision.",
    scoreLabel: "Musicality",
    minScore: 8,
    maxScore: 10,
    category: "Musicality",
  },
  {
    text: "Strong foundation and clean fundamentals — your basics are rock solid.",
    scoreLabel: "Foundation",
    minScore: 8,
    maxScore: 10,
    category: "Foundation",
  },
  {
    text: "Outstanding execution and control — every move is deliberate and polished.",
    scoreLabel: "Execution",
    minScore: 8,
    maxScore: 10,
    category: "Execution",
  },
  {
    text: "Great musical interpretation — you tell a story through the music.",
    scoreLabel: "Musicality",
    minScore: 7,
    maxScore: 10,
    category: "Musicality",
  },
  {
    text: "Original style and personality shine through — uniquely you.",
    scoreLabel: "Originality",
    minScore: 7,
    maxScore: 10,
    category: "Originality",
  },
  {
    text: "Smooth transitions and flow — seamless movement between elements.",
    scoreLabel: "Flow",
    minScore: 7,
    maxScore: 10,
    category: "Flow",
  },
  {
    text: "Commanding performance presence — you own the stage.",
    scoreLabel: "Presence",
    minScore: 7,
    maxScore: 10,
    category: "Presence",
  },
  {
    text: "Confident and bold — you perform with authority and conviction.",
    scoreLabel: "Confidence",
    minScore: 7,
    maxScore: 10,
    category: "Confidence",
  },
  {
    text: "Creative risk-taking pays off — innovative choices that elevate your set.",
    scoreLabel: "Creativity",
    minScore: 7,
    maxScore: 10,
    category: "Creativity",
  },
  {
    text: "Focus on cleaning up transitions and tightening your timing for next round.",
    scoreLabel: "Areas to improve",
    minScore: 0,
    maxScore: 6,
    category: "Improvement",
  },
];

async function ensureDefaultTemplates(organizerId: string) {
  const existing = await prisma.feedbackTemplate.findFirst({
    where: { organizerId },
    select: { id: true },
  });

  if (existing) return;

  await prisma.feedbackTemplate.createMany({
    data: DEFAULT_JUDGE_FEEDBACK_TEMPLATES.map((t) => ({
      ...t,
      organizerId,
    })),
  });
}

type Context = { params: Promise<{ code: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    const { code } = await params;

    const slot = await prisma.judgeSlot.findUnique({
      where: { code: code.toUpperCase() },
      select: {
        id: true,
        isActive: true,
        event: { select: { organizerId: true } },
      },
    });

    if (!slot || !slot.isActive) {
      return notFound("Judge slot");
    }

    await ensureDefaultTemplates(slot.event.organizerId);

    const templates = await prisma.feedbackTemplate.findMany({
      where: { organizerId: slot.event.organizerId },
      orderBy: { createdAt: "desc" },
      select: { id: true, text: true, scoreLabel: true, minScore: true, maxScore: true },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

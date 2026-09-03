import { NextResponse } from "next/server";
import { notFound, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

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

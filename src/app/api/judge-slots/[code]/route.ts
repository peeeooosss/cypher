import { NextResponse } from "next/server";
import { notFound, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ code: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    const { code } = await params;

    const slot = await prisma.judgeSlot.findUnique({
      where: { code },
      include: {
        category: {
          select: { id: true, name: true, currentPhaseOrder: true, eventId: true },
        },
      },
    });

    if (!slot) {
      return notFound("Judge slot");
    }

    const [rounds, registrations, matches, event] = await Promise.all([
      prisma.roundFormat.findMany({
        where: { categoryId: slot.categoryId },
        orderBy: { order: "asc" },
        select: { id: true, order: true, type: true, label: true, phaseStatus: true },
      }),
      prisma.registration.findMany({
        where: { categoryId: slot.categoryId, status: "CONFIRMED" },
        include: {
          user: { select: { name: true, email: true } },
          members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } },
          dancerScores: { select: { roundFormatId: true, score: true, judgeSlotId: true, feedback: true } },
        },
        orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
      }),
      prisma.battleMatch.findMany({
        where: { categoryId: slot.categoryId },
        include: {
          competitorA: { include: { user: { select: { name: true } } } },
          competitorB: { include: { user: { select: { name: true } } } },
          scores: true,
        },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      }),
      prisma.event.findUnique({
        where: { id: slot.eventId },
        select: { id: true, title: true },
      }),
    ]);

    return NextResponse.json({
      ...slot,
      category: {
        id: slot.category.id,
        name: slot.category.name,
        currentPhaseOrder: slot.category.currentPhaseOrder,
        event: event!,
        rounds,
        registrations,
        matches,
      },
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

import { NextResponse } from "next/server";
import { notFound } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ eventId: string }> };

export async function GET(_: Request, { params }: Context) {
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      status: true,
      categories: {
        select: {
          id: true,
          name: true,
          currentPhaseOrder: true,
          rounds: {
            select: {
              id: true,
              order: true,
              type: true,
              label: true,
              phaseStatus: true,
            },
            orderBy: { order: "asc" },
          },
          registrations: {
            where: { status: "CONFIRMED" },
            select: {
              id: true,
              seed: true,
              crew: true,
              user: { select: { name: true } },
              dancerScores: { select: { score: true, roundFormatId: true } },
            },
          },
          matches: {
            select: {
              id: true,
              round: true,
              position: true,
              status: true,
              winnerId: true,
              competitorA: { select: { id: true, user: { select: { name: true } } } },
              competitorB: { select: { id: true, user: { select: { name: true } } } },
              winner: { select: { id: true, user: { select: { name: true } } } },
              scores: {
                select: {
                  winnerCorner: true,
                  feedback: true,
                  judgeSlot: { select: { name: true, code: true } },
                },
              },
            },
            orderBy: [{ round: "asc" }, { position: "asc" }],
          },
        },
      },
    },
  });

  if (!event) return notFound("Event");

  const data = {
    eventId: event.id,
    title: event.title,
    status: event.status,
    categories: event.categories.map((category) => ({
      categoryId: category.id,
      name: category.name,
      currentPhaseOrder: category.currentPhaseOrder,
      rounds: category.rounds.map((r) => ({
        id: r.id,
        order: r.order,
        type: r.type,
        label: r.label,
        phaseStatus: r.phaseStatus,
      })),
      registrations: category.registrations.map((reg) => ({
        id: reg.id,
        seed: reg.seed,
        crew: reg.crew,
        name: reg.user.name ?? "Unnamed",
        dancerScores: reg.dancerScores.map((d) => ({
          score: d.score,
          roundFormatId: d.roundFormatId,
        })),
      })),
      matches: category.matches.map((m) => ({
        id: m.id,
        round: m.round,
        position: m.position,
        status: m.status,
        redName: m.competitorA?.user.name ?? "TBD",
        blueName: m.competitorB?.user.name ?? "TBD",
        winnerId: m.winnerId,
        winnerName: m.winner?.user.name ?? null,
        scores: m.scores.map((s) => ({
          judgeName: s.judgeSlot.name ?? s.judgeSlot.code,
          winnerCorner: s.winnerCorner,
          feedback: s.feedback,
        })),
      })),
    })),
  };

  return NextResponse.json(data);
}

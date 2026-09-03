import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { BracketError, generateBracket } from "@/lib/bracket";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type BracketRouteContext = { params: Promise<{ eventId: string; categoryId: string }> };

export async function GET(_: Request, { params }: BracketRouteContext) {
  try {
    const { eventId, categoryId } = await params;
    const category = await prisma.category.findFirst({
      where: { id: categoryId, eventId },
      include: { rounds: { orderBy: { order: "asc" } } },
    });

    if (!category) return notFound("Category");

    const currentPhase = category.rounds.find(
      (round) => round.order === category.currentPhaseOrder && round.phaseStatus === "ACTIVE",
    );

    if (!currentPhase) return NextResponse.json([]);

    const matches = await prisma.battleMatch.findMany({
      where: { eventId, categoryId, roundFormatId: currentPhase.id },
      include: {
         competitorA: { include: { user: { select: { id: true, name: true } }, members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } } } },
         competitorB: { include: { user: { select: { id: true, name: true } }, members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } } } },
         winner: { include: { user: { select: { id: true, name: true } }, members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } } } },
        scores: true,
      },
      orderBy: [{ round: "asc" }, { position: "asc" }],
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(_: Request, { params }: BracketRouteContext) {
  try {
    const { eventId, categoryId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return unauthorized();
    }

    if (user.role !== "ORGANIZER") {
      return forbidden();
    }

    if (!(await getEventForOwner(eventId, user.id))) {
      return notFound("Event");
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, eventId },
      include: { rounds: { orderBy: { order: "asc" } } },
    });

    if (!category) {
      return notFound("Category");
    }

    const currentPhase = category.rounds.find(
      (round) => round.order === category.currentPhaseOrder && round.phaseStatus === "ACTIVE",
    );
    if (!currentPhase) return badRequest("No active battle phase");

    const matches = await generateBracket(categoryId, user.id, currentPhase.id);
    return NextResponse.json(matches, { status: 201 });
  } catch (error) {
    if (error instanceof BracketError) {
      return badRequest(error.message);
    }

    console.error(error);
    return serverError();
  }
}

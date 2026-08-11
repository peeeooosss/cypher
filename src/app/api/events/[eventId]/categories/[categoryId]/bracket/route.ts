import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api";
import { BracketError, generateBracket } from "@/lib/bracket";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type BracketRouteContext = { params: Promise<{ eventId: string; categoryId: string }> };

export async function GET(_: Request, { params }: BracketRouteContext) {
  const { eventId, categoryId } = await params;
  const matches = await prisma.battleMatch.findMany({
    where: { eventId, categoryId },
    include: {
       competitorA: { include: { user: { select: { id: true, name: true } }, members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } } } },
       competitorB: { include: { user: { select: { id: true, name: true } }, members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } } } },
       winner: { include: { user: { select: { id: true, name: true } }, members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } } } },
      scores: true,
    },
    orderBy: [{ round: "asc" }, { position: "asc" }],
  });

  return NextResponse.json(matches);
}

export async function POST(_: Request, { params }: BracketRouteContext) {
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

  const category = await prisma.category.findFirst({ where: { id: categoryId, eventId }, select: { id: true } });

  if (!category) {
    return notFound("Category");
  }

  try {
    const matches = await generateBracket(categoryId, user.id);
    return NextResponse.json(matches, { status: 201 });
  } catch (error) {
    if (error instanceof BracketError) {
      return badRequest(error.message);
    }

    console.error(error);
    return NextResponse.json({ error: "Unable to generate bracket" }, { status: 500 });
  }
}

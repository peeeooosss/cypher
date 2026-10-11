import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";
import { getMatchState } from "@/lib/live-match";

const winnerLockSchema = z.object({ locked: z.boolean() });

type Context = { params: Promise<{ matchId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { matchId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const parsed = winnerLockSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Provide a locked boolean");

    const match = await prisma.battleMatch.findUnique({
      where: { id: matchId },
      include: { category: { include: { event: { select: { organizerId: true } } } } },
    });

    if (!match) return notFound("Match");
    if (match.category.event.organizerId !== user.id) return forbidden();

    if (match.status !== "COMPLETE") return badRequest("Only a completed match can be locked");

    const updated = await prisma.battleMatch.update({
      where: { id: match.id },
      data: { winnerLocked: parsed.data.locked },
    });

    const winnerCorner = match.competitorAId === updated.winnerId ? "red" : "blue";
    const bracket = await getMatchState(match.eventId);
    await emitToSocket(match.eventId, "match_complete", {
      matchId: match.id,
      winnerCorner,
      nextMatchId: updated.nextMatchId,
      bracketUpdated: bracket,
    });

    return NextResponse.json({ id: updated.id, winnerLocked: updated.winnerLocked });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

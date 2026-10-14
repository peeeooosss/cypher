import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";
import { getMatchState } from "@/lib/live-match";

type Context = { params: Promise<{ matchId: string }> };

const setupSchema = z.object({
  winnerCount: z.union([z.literal(1), z.literal(2)]).optional(),
  matchSize: z.union([z.literal(2), z.literal(3)]).optional(),
});

/**
 * Reconfigure a PENDING match: 1v1 ↔ 3-way and winners 1-or-2.
 * Completed/locked matches are frozen — unlock and reset them first.
 */
export async function PATCH(request: Request, { params }: Context) {
  try {
    const { matchId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const parsed = setupSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Provide winnerCount (1 or 2) and/or matchSize (2 or 3)");

    const match = await prisma.battleMatch.findUnique({
      where: { id: matchId },
      include: { category: { include: { event: { select: { organizerId: true } } } } },
    });
    if (!match) return notFound("Match");
    if (match.category.event.organizerId !== user.id) return forbidden();
    if (match.status !== "PENDING") return badRequest("Only a pending match can be reconfigured");

    const matchSize = parsed.data.matchSize ?? match.matchSize;
    const winnerCount = parsed.data.winnerCount ?? match.winnerCount;
    if (winnerCount === 2 && matchSize < 3) {
      return badRequest("Two winners need a 3-way match");
    }
    if (matchSize === 2 && match.competitorCId) {
      return badRequest("This match already has a third lane — move it out first");
    }

    const updated = await prisma.battleMatch.update({
      where: { id: matchId },
      data: { matchSize, winnerCount, runnerUpId: null },
    });

    const bracket = await getMatchState(match.eventId);
    await emitToSocket(match.eventId, "bracket:generated", {
      matches: bracket,
      categoryId: match.categoryId,
    });

    return NextResponse.json({ id: updated.id, matchSize: updated.matchSize, winnerCount: updated.winnerCount });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

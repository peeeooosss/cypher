import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api";
import { BracketError, completeMatch } from "@/lib/bracket";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";
import { getMatchState } from "@/lib/live-match";

const completeSchema = z.object({ winnerId: z.string().cuid() });
type MatchRouteContext = { params: Promise<{ matchId: string }> };

export async function POST(request: Request, { params }: MatchRouteContext) {
  const { matchId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const parsed = completeSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest("A valid winnerId is required");
  }

  try {
    const completed = await completeMatch(matchId, parsed.data.winnerId, user.id);

    const match = await prisma.battleMatch.findUnique({
      where: { id: matchId },
      select: { eventId: true, competitorAId: true },
    });

    if (match) {
      const winnerCorner = match.competitorAId === parsed.data.winnerId ? "red" : "blue";
      const bracket = await getMatchState(match.eventId);
      await emitToSocket(match.eventId, "match_complete", {
        matchId,
        winnerCorner,
        nextMatchId: completed.nextMatchId,
        bracketUpdated: bracket,
      });
    }

    return NextResponse.json(completed);
  } catch (error) {
    if (error instanceof BracketError) {
      return notFound(error.message);
    }

    console.error(error);
    return NextResponse.json({ error: "Unable to complete match" }, { status: 500 });
  }
}

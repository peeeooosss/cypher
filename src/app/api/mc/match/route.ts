import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, conflict, forbidden, notFound, serverError } from "@/lib/api";
import { BracketError, completeMatch, winnerCornerFor } from "@/lib/bracket";
import { prisma } from "@/lib/prisma";
import { getStaffSession } from "@/lib/staff-codes";
import { emitToSocket } from "@/lib/socket-emit";
import { getDefaultTimeLimit, getLiveMatchPayload, getMatchState } from "@/lib/live-match";

const pushSchema = z.object({ matchId: z.string().min(1), timeLimitMs: z.number().int().positive().max(600000).optional() });

export async function POST(request: Request) {
  try {
    const session = await getStaffSession();
    if (!session) return forbidden();

    const parsed = pushSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("matchId is required");

    const match = await prisma.battleMatch.findFirst({
      where: { id: parsed.data.matchId, eventId: session.eventId },
      select: { id: true, status: true, roundFormatId: true, eventId: true },
    });
    if (!match) return notFound("Match");
    if (match.status === "COMPLETE") return conflict("This match is already complete");

    const timeLimitMs = parsed.data.timeLimitMs ?? (await getDefaultTimeLimit(match.roundFormatId));

    await prisma.$transaction([
      prisma.battleMatch.update({
        where: { id: match.id },
        data: { status: "LIVE", startedAt: new Date() },
      }),
      prisma.battleTimer.upsert({
        where: { matchId: match.id },
        update: { timeLimitMs, startedAt: new Date(), lockedAt: null },
        create: { matchId: match.id, timeLimitMs, startedAt: new Date() },
      }),
    ]);

    const livePayload = await getLiveMatchPayload(match.id);
    if (livePayload) await emitToSocket(match.eventId, "match_live", livePayload);

    return NextResponse.json({ ok: true, matchId: match.id });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

const setupSchema = z.object({
  matchId: z.string().min(1),
  winnerCount: z.union([z.literal(1), z.literal(2)]),
});

/** MC/Host may set winners 1-or-2 on a PENDING 3-way match before declaring results. */
export async function PATCH(request: Request) {
  try {
    const session = await getStaffSession();
    if (!session) return forbidden();

    const parsed = setupSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("matchId and winnerCount (1 or 2) are required");

    const match = await prisma.battleMatch.findFirst({
      where: { id: parsed.data.matchId, eventId: session.eventId },
      select: { id: true, status: true, matchSize: true },
    });
    if (!match) return notFound("Match");
    if (match.status !== "PENDING") return badRequest("Only a pending match can be reconfigured");
    if (parsed.data.winnerCount === 2 && match.matchSize < 3) {
      return badRequest("Two winners need a 3-way match");
    }

    const updated = await prisma.battleMatch.update({
      where: { id: match.id },
      data: { winnerCount: parsed.data.winnerCount, runnerUpId: null },
    });
    return NextResponse.json({ id: updated.id, winnerCount: updated.winnerCount });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

const completeSchema = z.object({
  matchId: z.string().min(1),
  winnerId: z.string().min(1),
  runnerUpId: z.string().min(1).nullish(),
});

export async function PUT(request: Request) {
  try {
    const session = await getStaffSession();
    if (!session) return forbidden();

    const parsed = completeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("A valid winnerId is required");

    const event = await prisma.event.findUnique({
      where: { id: session.eventId },
      select: { organizerId: true },
    });
    if (!event) return forbidden();

    const belongs = await prisma.battleMatch.findFirst({
      where: { id: parsed.data.matchId, eventId: session.eventId },
      select: { id: true },
    });
    if (!belongs) return notFound("Match");

    try {
      const completed = await completeMatch(parsed.data.matchId, parsed.data.winnerId, event.organizerId, {
        runnerUpId: parsed.data.runnerUpId ?? null,
      });

      const match = await prisma.battleMatch.findUnique({
        where: { id: parsed.data.matchId },
        select: { eventId: true, competitorAId: true, competitorBId: true, competitorCId: true },
      });
      if (match) {
        const winnerCorner =
          winnerCornerFor({
            competitorAId: match.competitorAId,
            competitorBId: match.competitorBId,
            competitorCId: match.competitorCId,
            winnerId: parsed.data.winnerId,
          }) ?? "red";
        const bracket = await getMatchState(match.eventId);
        await emitToSocket(match.eventId, "match_complete", {
          matchId: parsed.data.matchId,
          winnerCorner,
          runnerUpId: completed.runnerUpId,
          nextMatchId: completed.nextMatchId,
          bracketUpdated: bracket,
        });
      }

      return NextResponse.json(completed);
    } catch (error) {
      if (error instanceof BracketError) return badRequest(error.message);
      throw error;
    }
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { conflict, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";
import { getDefaultTimeLimit, getLiveMatchPayload } from "@/lib/live-match";

const pushSchema = z.object({
  timeLimitMs: z.number().int().positive().max(600000).optional(),
});

type Context = { params: Promise<{ matchId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { matchId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = pushSchema.safeParse(body ?? {});

    const match = await prisma.battleMatch.findUnique({
      where: { id: matchId },
      include: { category: { include: { event: { select: { organizerId: true } } } } },
    });

    if (!match) return notFound("Match");
    if (match.category.event.organizerId !== user.id) return forbidden();
    if (match.status === "COMPLETE") {
      return conflict("This match is already complete");
    }

    const timeLimitMs =
      parsed.success && parsed.data.timeLimitMs != null
        ? parsed.data.timeLimitMs
        : await getDefaultTimeLimit(match.roundFormatId);

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
    if (livePayload) {
      await emitToSocket(match.eventId, "match_live", livePayload);
    }

    return NextResponse.json(livePayload ?? { error: "Match not found" });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

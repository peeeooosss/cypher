import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";

const lockSchema = z.object({ locked: z.boolean() });

type Context = { params: Promise<{ matchId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { matchId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const parsed = lockSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Provide a locked boolean");

    const match = await prisma.battleMatch.findUnique({
      where: { id: matchId },
      include: { category: { include: { event: { select: { organizerId: true } } } } },
    });

    if (!match) return notFound("Match");
    if (match.category.event.organizerId !== user.id) return forbidden();

    if (parsed.data.locked) {
      await prisma.$transaction([
        prisma.battleMatch.update({ where: { id: match.id }, data: { status: "LOCKED" } }),
        prisma.battleTimer.updateMany({
          where: { matchId: match.id },
          data: { lockedAt: new Date() },
        }),
      ]);
    } else {
      await prisma.battleMatch.update({ where: { id: match.id }, data: { status: "LIVE" } });
    }

    await emitToSocket(match.eventId, "score_locked", {
      matchId: match.id,
      locked: parsed.data.locked,
    });

    return NextResponse.json({ matchId: match.id, locked: parsed.data.locked });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

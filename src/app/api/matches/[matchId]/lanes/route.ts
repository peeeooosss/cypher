import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";
import { getMatchState } from "@/lib/live-match";

type Context = { params: Promise<{ matchId: string }> };

const lanesSchema = z.object({
  competitorAId: z.string().min(1).nullish(),
  competitorBId: z.string().min(1).nullish(),
  competitorCId: z.string().min(1).nullish(),
});

/**
 * Swap / substitute lanes on a PENDING match (no-shows, bad seeding).
 * Completed + locked matches are frozen — unlock and reset them first.
 */
export async function PATCH(request: Request, { params }: Context) {
  try {
    const { matchId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const parsed = lanesSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Provide lane registration ids");

    const match = await prisma.battleMatch.findUnique({
      where: { id: matchId },
      include: { category: { include: { event: { select: { organizerId: true } } } } },
    });
    if (!match) return notFound("Match");
    if (match.category.event.organizerId !== user.id) return forbidden();
    if (match.status !== "PENDING") return badRequest("Only a pending match can be edited — reset it first");

    const next = {
      competitorAId: parsed.data.competitorAId !== undefined ? parsed.data.competitorAId : match.competitorAId,
      competitorBId: parsed.data.competitorBId !== undefined ? parsed.data.competitorBId : match.competitorBId,
      competitorCId: parsed.data.competitorCId !== undefined ? parsed.data.competitorCId : match.competitorCId,
    };

    const laneIds = [next.competitorAId, next.competitorBId, next.competitorCId].filter(
      (id): id is string => Boolean(id),
    );
    if (laneIds.length < 2) return badRequest("A match needs at least two lanes");
    if (new Set(laneIds).size !== laneIds.length) return badRequest("Lanes must be different entries");

    const entries = await prisma.registration.findMany({
      where: { id: { in: laneIds }, categoryId: match.categoryId },
      select: { id: true, status: true, teamName: true, user: { select: { name: true } } },
    });
    if (entries.length !== laneIds.length) {
      return badRequest("Every lane must be an entry of this category");
    }
    const withdrawn = entries.filter((e) => e.status === "WITHDRAWN");
    if (withdrawn.length > 0) {
      // Auto top-up: a withdrawn substitute rejoins on placement.
      await prisma.registration.updateMany({
        where: { id: { in: withdrawn.map((e) => e.id) } },
        data: { status: "CONFIRMED" },
      });
    }
    const bad = entries.filter((e) => e.status !== "CONFIRMED" && e.status !== "WITHDRAWN");
    if (bad.length > 0) return badRequest("Only confirmed (or withdrawn substitute) entries can be placed");

    const clashes = await prisma.battleMatch.findMany({
      where: {
        categoryId: match.categoryId,
        roundFormatId: match.roundFormatId,
        id: { not: matchId },
        OR: [
          { competitorAId: { in: laneIds } },
          { competitorBId: { in: laneIds } },
          { competitorCId: { in: laneIds } },
        ],
      },
      select: { id: true, position: true },
    });
    if (clashes.length > 0) {
      return badRequest(`That entry is already placed in M${clashes[0].position} — move it out first`);
    }

    const updated = await prisma.battleMatch.update({
      where: { id: matchId },
      data: {
        competitorAId: next.competitorAId,
        competitorBId: next.competitorBId,
        competitorCId: match.matchSize >= 3 ? next.competitorCId : null,
        winnerId: null,
        runnerUpId: null,
      },
    });

    await prisma.advancementAudit.create({
      data: {
        eventId: match.eventId,
        categoryId: match.categoryId,
        roundFormatId: match.roundFormatId,
        action: "LANES_EDITED",
        changedBy: user.id,
        reason: `M${match.position} lanes set to ${laneIds.map((id) => {
          const e = entries.find((x) => x.id === id);
          return e?.teamName ?? e?.user.name ?? id.slice(-4);
        }).join(" / ")}${withdrawn.length > 0 ? ` (${withdrawn.length} substitute${withdrawn.length === 1 ? "" : "s"} brought back)` : ""}`,
      },
    });

    const bracket = await getMatchState(match.eventId);
    await emitToSocket(match.eventId, "bracket:generated", { matches: bracket, categoryId: match.categoryId });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function DELETE(_: Request, { params }: Context) {
  try {
    const { matchId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const match = await prisma.battleMatch.findUnique({
      where: { id: matchId },
      include: { category: { include: { event: { select: { organizerId: true } } } } },
    });
    if (!match) return notFound("Match");
    if (match.category.event.organizerId !== user.id) return forbidden();
    if (match.status !== "PENDING") return badRequest("Only a pending match can be deleted");

    await prisma.$transaction([
      prisma.judgeAssignment.deleteMany({ where: { matchId } }),
      prisma.battleMatch.delete({ where: { id: matchId } }),
      prisma.advancementAudit.create({
        data: {
          eventId: match.eventId,
          categoryId: match.categoryId,
          roundFormatId: match.roundFormatId,
          action: "MATCH_DELETED",
          changedBy: user.id,
          reason: `M${match.position} (round ${match.round}) deleted before it ran`,
        },
      }),
    ]);

    const bracket = await getMatchState(match.eventId);
    await emitToSocket(match.eventId, "bracket:generated", { matches: bracket, categoryId: match.categoryId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

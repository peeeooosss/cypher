import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";

type Context = { params: Promise<{ categoryId: string }> };

const bodySchema = z.object({
  registrationIds: z.array(z.string().min(1)).min(1).max(128),
  reason: z.string().max(280).nullish(),
});

/** Ranked withdrawn entries available to bring back (suggested by prelim score). */
export async function GET(_: Request, { params }: Context) {
  try {
    const { categoryId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const category = await prisma.category.findFirst({
      where: { id: categoryId },
      include: { event: { select: { organizerId: true } } },
    });
    if (!category) return notFound("Category");
    if (category.event.organizerId !== user.id) return forbidden();

    const entries = await prisma.registration.findMany({
      where: { categoryId, status: "WITHDRAWN" },
      select: {
        id: true,
        seed: true,
        teamName: true,
        crew: true,
        user: { select: { name: true, username: true } },
        dancerScores: { select: { score: true } },
      },
      orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
    });

    const ranked = entries
      .map((e) => ({
        id: e.id,
        seed: e.seed,
        name: e.teamName ?? e.user.name ?? (e.user.username ? `@${e.user.username}` : "Unnamed"),
        crew: e.crew,
        total: e.dancerScores.reduce((s, d) => s + d.score, 0),
        judgeCount: e.dancerScores.length,
      }))
      .sort((a, b) => b.total - a.total || (a.seed ?? 9999) - (b.seed ?? 9999));

    return NextResponse.json(ranked);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

/**
 * Bring withdrawn entries back into an ACTIVE phase without touching anything
 * else — the TOP 16 → TOP 20 move. The organizer then rebuilds the bracket
 * (or places them manually) to seat the new entries.
 */
export async function POST(request: Request, { params }: Context) {
  try {
    const { categoryId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Select at least one entry to bring back");

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        event: { select: { id: true, organizerId: true } },
        rounds: { orderBy: { order: "asc" } },
      },
    });
    if (!category) return notFound("Category");
    if (category.event.organizerId !== user.id) return forbidden();

    const activePhase = category.rounds.find(
      (round) => round.order === category.currentPhaseOrder && round.phaseStatus === "ACTIVE",
    );
    if (!activePhase) return badRequest("No active phase to top up");

    const uniqueIds = [...new Set(parsed.data.registrationIds)];
    const entries = await prisma.registration.findMany({
      where: { id: { in: uniqueIds }, categoryId },
      select: { id: true, status: true, seed: true, teamName: true, user: { select: { name: true } } },
    });
    if (entries.length !== uniqueIds.length) {
      return badRequest("Some entries do not belong to this category");
    }
    const notWithdrawn = entries.filter((e) => e.status !== "WITHDRAWN");
    if (notWithdrawn.length > 0) {
      return badRequest("Only withdrawn entries can be brought back");
    }

    await prisma.$transaction([
      prisma.registration.updateMany({
        where: { id: { in: uniqueIds } },
        data: { status: "CONFIRMED" },
      }),
      prisma.advancementAudit.create({
        data: {
          eventId: category.eventId,
          categoryId,
          roundFormatId: activePhase.id,
          action: "TOP_UP",
          advanceCount: activePhase.advanceCount,
          winnerIds: uniqueIds,
          changedBy: user.id,
          reason: parsed.data.reason ?? `Brought back ${uniqueIds.length} withdrawn ${uniqueIds.length === 1 ? "entry" : "entries"}`,
        },
      }),
    ]);

    const confirmedCount = await prisma.registration.count({
      where: { categoryId, status: "CONFIRMED" },
    });
    const placedCount = await prisma.battleMatch.count({
      where: {
        categoryId,
        roundFormatId: activePhase.id,
        OR: [
          { competitorAId: { in: uniqueIds } },
          { competitorBId: { in: uniqueIds } },
          { competitorCId: { in: uniqueIds } },
        ],
      },
    });

    await emitToSocket(category.event.id, "registrations:topped-up", {
      categoryId,
      registrationIds: uniqueIds,
      confirmedCount,
    });

    return NextResponse.json({
      toppedUp: uniqueIds.map((id) => {
        const e = entries.find((x) => x.id === id);
        return { id, seed: e?.seed ?? null, name: e?.teamName ?? e?.user.name ?? "Unnamed" };
      }),
      confirmedCount,
      advanceCount: activePhase.advanceCount,
      alreadyPlaced: placedCount,
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

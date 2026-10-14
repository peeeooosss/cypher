import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { BATTLE_PHASE_TYPES } from "@/lib/bracket";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";

type Context = { params: Promise<{ eventId: string; categoryId: string }> };

const bodySchema = z.object({
  mode: z.enum(["pending-only", "full"]).default("pending-only"),
  matchSize: z.union([z.literal(2), z.literal(3)]).optional(),
});

export type RebuildPreview = {
  kept: number;
  rebuilt: number;
  created: number;
  byes: number;
  placed: { matchPosition: number; names: string[] }[];
};

/**
 * Rebuild a phase bracket without destroying completed results.
 * - pending-only: COMPLETE matches are frozen; PENDING matches are regenerated
 *   from entries not already placed in a kept match; brand-new entries get new matches.
 * - full: every match of the phase is regenerated (destroys votes — confirm first).
 */
export async function POST(request: Request, { params }: Context) {
  try {
    const { eventId, categoryId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Invalid rebuild request");

    const category = await prisma.category.findFirst({
      where: { id: categoryId, eventId },
      include: {
        event: { select: { organizerId: true } },
        rounds: { orderBy: { order: "asc" } },
      },
    });
    if (!category) return notFound("Category");
    if (category.event.organizerId !== user.id) return forbidden();

    const activePhase = category.rounds.find(
      (r) => r.order === category.currentPhaseOrder && r.phaseStatus === "ACTIVE",
    );
    if (!activePhase) return badRequest("No active phase to rebuild");
    if (!BATTLE_PHASE_TYPES.includes(activePhase.type as (typeof BATTLE_PHASE_TYPES)[number])) {
      return badRequest("Only battle phases have brackets");
    }

    const matchSize = parsed.data.matchSize ?? (activePhase.matchSize === 3 ? 3 : 2);
    if (matchSize !== activePhase.matchSize) {
      await prisma.roundFormat.update({ where: { id: activePhase.id }, data: { matchSize } });
    }

    const [entries, existing] = await Promise.all([
      prisma.registration.findMany({
        where: { categoryId, status: "CONFIRMED" },
        select: { id: true, seed: true, teamName: true, user: { select: { name: true } } },
        orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
      }),
      prisma.battleMatch.findMany({
        where: { categoryId, roundFormatId: activePhase.id },
        select: {
          id: true,
          status: true,
          position: true,
          competitorAId: true,
          competitorBId: true,
          competitorCId: true,
        },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      }),
    ]);

    if (entries.length < 2) return badRequest("At least two confirmed entries are required");

    const kept = parsed.data.mode === "pending-only" ? existing.filter((m) => m.status === "COMPLETE") : [];
    const usedIds = new Set(
      kept.flatMap((m) => [m.competitorAId, m.competitorBId, m.competitorCId]).filter((id): id is string => Boolean(id)),
    );
    const free = entries.filter((e) => !usedIds.has(e.id));

    const nameOf = (id: string) => {
      const e = entries.find((x) => x.id === id);
      return e?.teamName ?? e?.user.name ?? "Unnamed";
    };

    const result = await prisma.$transaction(async (transaction) => {
      if (parsed.data.mode === "full") {
        const ids = existing.map((m) => m.id);
        if (ids.length > 0) {
          await transaction.judgeAssignment.deleteMany({ where: { matchId: { in: ids } } });
          await transaction.scoreAuditLog.deleteMany({ where: { matchId: { in: ids } } });
          await transaction.battleMatch.deleteMany({ where: { id: { in: ids } } });
        }
      } else {
        const pendingIds = existing.filter((m) => m.status !== "COMPLETE").map((m) => m.id);
        if (pendingIds.length > 0) {
          await transaction.judgeAssignment.deleteMany({ where: { matchId: { in: pendingIds } } });
          await transaction.battleMatch.deleteMany({ where: { id: { in: pendingIds } } });
        }
      }

      // Kept matches retain their positions; new matches append after them.
      let position = kept.reduce((max, m) => Math.max(max, m.position), 0);

      const placed: RebuildPreview["placed"] = [];
      let byes = 0;
      for (let i = 0; i < free.length; i += matchSize) {
        const lane = free.slice(i, i + matchSize);
        position += 1;
        const isBye = lane.length === 1;
        if (isBye) byes += 1;
        await transaction.battleMatch.create({
          data: {
            eventId,
            categoryId,
            roundFormatId: activePhase.id,
            round: 1,
            position,
            matchSize,
            competitorAId: lane[0]?.id,
            competitorBId: lane[1]?.id,
            competitorCId: lane[2]?.id,
            status: isBye ? "COMPLETE" : "PENDING",
            winnerId: isBye ? lane[0]?.id : undefined,
            completedAt: isBye ? new Date() : undefined,
          },
        });
        placed.push({ matchPosition: position, names: lane.map((e) => nameOf(e.id)) });
      }

      await transaction.advancementAudit.create({
        data: {
          eventId,
          categoryId,
          roundFormatId: activePhase.id,
          action: "BRACKET_REBUILT",
          advanceCount: activePhase.advanceCount,
          changedBy: user.id,
          reason: `Bracket rebuilt (${parsed.data.mode}, ${matchSize === 3 ? "3-way" : "1v1"}): ${kept.length} kept, ${placed.length} new`,
        },
      });

      return { kept: kept.length, rebuilt: existing.length - kept.length, created: placed.length, byes, placed };
    });

    const bracket = await prisma.battleMatch.findMany({
      where: { categoryId, roundFormatId: activePhase.id },
      orderBy: [{ round: "asc" }, { position: "asc" }],
    });
    await emitToSocket(eventId, "bracket:generated", { matches: bracket, categoryId });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

import { BATTLE_PHASE_TYPES, generateBracket, BracketError } from "@/lib/bracket";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";

export class AdvanceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type AdvanceResult = {
  previousPhase: { id: string; order: number };
  nextPhase: { id: string; order: number; type: string; label: string | null } | null;
  matches: unknown[];
  winners: string[];
  advanceCount: number | null;
};

export async function advancePhaseCore(opts: {
  categoryId: string;
  organizerId: string;
  advanceCountOverride?: number | null;
  changedBy?: string | null;
  reason?: string | null;
}): Promise<AdvanceResult> {
  const { categoryId, organizerId, changedBy = null, reason = null } = opts;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      event: { select: { id: true, organizerId: true } },
      rounds: { orderBy: { order: "asc" } },
    },
  });

  if (!category) throw new AdvanceError(404, "Category not found");
  if (category.event.organizerId !== organizerId) throw new AdvanceError(403, "Forbidden");

  const currentPhase = category.rounds.find(
    (round) => round.order === category.currentPhaseOrder && round.phaseStatus === "ACTIVE",
  );
  if (!currentPhase) throw new AdvanceError(400, "No active phase to advance");

  let effectiveAdvanceCount = currentPhase.advanceCount;
  const override = opts.advanceCountOverride;
  if (override != null) {
    if (!Number.isInteger(override) || override < 1 || override > 512) {
      throw new AdvanceError(400, "Top-N must be a whole number between 1 and 512");
    }
    if (override !== currentPhase.advanceCount) {
      await prisma.roundFormat.update({
        where: { id: currentPhase.id },
        data: { advanceCount: override },
      });
      await prisma.advancementAudit.create({
        data: {
          eventId: category.eventId,
          categoryId,
          roundFormatId: currentPhase.id,
          action: "TOP_N_SET",
          advanceCount: override,
          changedBy,
          reason: reason ?? `Top-N changed from ${currentPhase.advanceCount ?? "unset"} to ${override}`,
        },
      });
      effectiveAdvanceCount = override;
    }
  }

  const isBattlePhase = BATTLE_PHASE_TYPES.includes(
    currentPhase.type as (typeof BATTLE_PHASE_TYPES)[number],
  );
  let winners: string[] = [];

  if (isBattlePhase) {
    const matches = await prisma.battleMatch.findMany({
      where: { categoryId, roundFormatId: currentPhase.id },
      select: {
        status: true,
        winnerId: true,
        runnerUpId: true,
        competitorAId: true,
        competitorBId: true,
        competitorCId: true,
      },
      orderBy: { position: "asc" },
    });

    if (matches.length === 0) throw new AdvanceError(400, "No battle matches have been generated for this phase");
    if (matches.some((match) => match.status !== "COMPLETE" || !match.winnerId)) {
      throw new AdvanceError(400, "Complete every battle match before advancing");
    }

    const ids = matches.flatMap((m) => [m.winnerId, m.runnerUpId]).filter((id): id is string => Boolean(id));
    winners = [...new Set(ids)];

    if (effectiveAdvanceCount != null && winners.length !== effectiveAdvanceCount) {
      throw new AdvanceError(400, `This phase must advance exactly ${effectiveAdvanceCount} entries (winners + runner-ups so far: ${winners.length})`);
    }
  } else if (effectiveAdvanceCount != null) {
    const confirmedCount = await prisma.registration.count({
      where: { categoryId, status: "CONFIRMED" },
    });
    if (confirmedCount !== effectiveAdvanceCount) {
      throw new AdvanceError(400, `Select exactly ${effectiveAdvanceCount} entries before advancing (currently ${confirmedCount} confirmed)`);
    }
    const confirmed = await prisma.registration.findMany({
      where: { categoryId, status: "CONFIRMED" },
      select: { id: true },
    });
    winners = confirmed.map((r) => r.id);
  }

  const nextPhase = category.rounds.find(
    (round) => round.order > currentPhase.order && round.phaseStatus !== "COMPLETE" && round.phaseStatus !== "ACTIVE",
  );

  await prisma.$transaction(async (transaction) => {
    if (isBattlePhase) {
      const confirmedEntries = await transaction.registration.findMany({
        where: { categoryId, status: "CONFIRMED" },
        select: { id: true },
      });
      const loserIds = confirmedEntries
        .map((entry) => entry.id)
        .filter((id) => !winners.includes(id));
      if (loserIds.length > 0) {
        await transaction.registration.updateMany({
          where: { categoryId, id: { in: loserIds } },
          data: { status: "WITHDRAWN" },
        });
      }
    }

    await transaction.roundFormat.update({
      where: { id: currentPhase.id },
      data: { phaseStatus: "COMPLETE" },
    });

    if (nextPhase) {
      await transaction.category.update({
        where: { id: categoryId },
        data: { currentPhaseOrder: nextPhase.order },
      });
      await transaction.roundFormat.update({
        where: { id: nextPhase.id },
        data: { phaseStatus: "ACTIVE" },
      });
    } else {
      await transaction.category.update({
        where: { id: categoryId },
        data: { currentPhaseOrder: null },
      });
    }
  });

  let matches: unknown[] = [];
  if (nextPhase && BATTLE_PHASE_TYPES.includes(nextPhase.type as (typeof BATTLE_PHASE_TYPES)[number])) {
    try {
      matches = await generateBracket(categoryId, organizerId, nextPhase.id, {
        matchSize: nextPhase.matchSize === 3 ? 3 : 2,
      });
    } catch (error) {
      if (error instanceof BracketError) throw new AdvanceError(400, error.message);
      throw error;
    }
  }

  await prisma.advancementAudit.create({
    data: {
      eventId: category.eventId,
      categoryId,
      roundFormatId: currentPhase.id,
      action: "PHASE_ADVANCED",
      advanceCount: effectiveAdvanceCount,
      winnerIds: winners,
      changedBy,
      reason,
    },
  });

  await emitToSocket(category.eventId, "phase:completed", {
    phaseId: currentPhase.id,
    phaseOrder: currentPhase.order,
    categoryId,
  });

  if (nextPhase) {
    await emitToSocket(category.eventId, "phase:activated", {
      phaseId: nextPhase.id,
      phaseOrder: nextPhase.order,
      type: nextPhase.type,
      label: nextPhase.label,
      categoryId,
    });
    if (matches.length > 0) {
      await emitToSocket(category.eventId, "bracket:generated", {
        matches,
        categoryId,
      });
    }
  }

  return {
    previousPhase: { id: currentPhase.id, order: currentPhase.order },
    nextPhase: nextPhase
      ? { id: nextPhase.id, order: nextPhase.order, type: nextPhase.type, label: nextPhase.label }
      : null,
    matches,
    winners,
    advanceCount: effectiveAdvanceCount,
  };
}

import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api";
import { generateBracket, BracketError } from "@/lib/bracket";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";

type Context = { params: Promise<{ categoryId: string }> };

export async function POST(_request: Request, { params }: Context) {
  const { categoryId } = await params;
  const user = await getCurrentUser();

  if (!user) return unauthorized();
  if (user.role !== "ORGANIZER") return forbidden();

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { event: { select: { organizerId: true, id: true } }, rounds: { orderBy: { order: "asc" } } },
  });

  if (!category) return notFound("Category");
  if (category.event.organizerId !== user.id) return forbidden();

  const nextPhase = category.rounds.find((r) => r.phaseStatus !== "COMPLETE" && r.phaseStatus !== "ACTIVE");
  if (!nextPhase) return badRequest("No pending phases to start");

  await prisma.category.update({ where: { id: categoryId }, data: { currentPhaseOrder: nextPhase.order } });
  await prisma.roundFormat.update({ where: { id: nextPhase.id }, data: { phaseStatus: "ACTIVE" } });

  let matches: unknown[] = [];
  if (["BATTLE_1V1", "BATTLE_2V2", "BATTLE_3V3", "BATTLE_4V4", "CREW_VS_CREW", "FINAL"].includes(nextPhase.type)) {
    try {
      matches = await generateBracket(categoryId, user.id);
    } catch (error) {
      if (error instanceof BracketError) return badRequest(error.message);
      throw error;
    }
  }

  await emitToSocket(category.eventId, "phase:activated", {
    phaseId: nextPhase.id,
    phaseOrder: nextPhase.order,
    type: nextPhase.type,
    label: nextPhase.label,
    categoryId,
  });

  return NextResponse.json({ phase: nextPhase, matches });
}

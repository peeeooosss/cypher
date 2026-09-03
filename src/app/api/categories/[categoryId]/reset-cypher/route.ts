import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { clearCategoryCompetitionData, restoreCategoryRegistrations } from "@/lib/category-phase";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";

type Context = { params: Promise<{ categoryId: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const { categoryId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        event: { select: { organizerId: true, id: true } },
        rounds: { orderBy: { order: "asc" } },
        _count: { select: { registrations: true } },
      },
    });

    if (!category) return notFound("Category");
    if (category.event.organizerId !== user.id) return forbidden();

    const cypher = category.rounds.find((round) => round.type === "CYPHER");
    if (!cypher) return badRequest("Add a CYPHER phase before resetting this category");

    await prisma.$transaction(async (transaction) => {
      await clearCategoryCompetitionData(transaction, categoryId);
      await restoreCategoryRegistrations(transaction, categoryId, true);
      await transaction.roundFormat.updateMany({
        where: { categoryId },
        data: { phaseStatus: "PENDING" },
      });
      await transaction.roundFormat.updateMany({
        where: { categoryId, order: { lt: cypher.order } },
        data: { phaseStatus: "COMPLETE" },
      });
      await transaction.category.update({
        where: { id: categoryId },
        data: { currentPhaseOrder: null },
      });
    });

    await emitToSocket(category.event.id, "leaderboard:update", { categoryId });

    return NextResponse.json({ reset: true, phase: cypher, registrationCount: category._count.registrations });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

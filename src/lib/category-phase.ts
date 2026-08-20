import type { Prisma } from "@/generated/prisma/client";

export async function clearCategoryCompetitionData(
  transaction: Prisma.TransactionClient,
  categoryId: string,
) {
  const matches = await transaction.battleMatch.findMany({
    where: { categoryId },
    select: { id: true },
  });

  if (matches.length > 0) {
    await transaction.scoreAuditLog.deleteMany({
      where: { matchId: { in: matches.map((match) => match.id) } },
    });
    await transaction.battleMatch.deleteMany({ where: { categoryId } });
  }

  await transaction.dancerScore.deleteMany({
    where: { roundFormat: { categoryId } },
  });
}

export async function restoreCategoryRegistrations(
  transaction: Prisma.TransactionClient,
  categoryId: string,
  reseed = false,
) {
  const registrations = await transaction.registration.findMany({
    where: { categoryId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  for (const [index, registration] of registrations.entries()) {
    await transaction.registration.update({
      where: { id: registration.id },
      data: {
        status: "CONFIRMED",
        ...(reseed ? { seed: index + 1 } : {}),
      },
    });
  }
}

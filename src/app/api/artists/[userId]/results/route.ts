import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ userId: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    const { userId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return unauthorized();
    }

    if (user.role !== "ARTIST" && user.role !== "ORGANIZER") {
      return forbidden();
    }

    if (user.role === "ARTIST" && user.id !== userId) {
      return forbidden();
    }

    const registrations = await prisma.registration.findMany({
      where: { userId },
      include: {
        category: {
          include: { prizePool: true, event: { select: { id: true, title: true } } },
        },
        matchesAsA: {
          include: {
            scores: { include: { judgeSlot: { select: { name: true } } } },
            competitorB: { select: { userId: true, user: { select: { name: true } } } },
          },
        },
        matchesAsB: {
          include: {
            scores: { include: { judgeSlot: { select: { name: true } } } },
            competitorA: { select: { userId: true, user: { select: { name: true } } } },
          },
        },
        matchesWon: { select: { id: true, categoryId: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (registrations.length === 0) {
      return notFound("Artist results");
    }

    const totalMatches = registrations.reduce((sum, r) => sum + r.matchesAsA.length + r.matchesAsB.length, 0);
    const totalWins = registrations.reduce((sum, r) => sum + r.matchesWon.length, 0);

    return NextResponse.json({ registrations, totalWins, totalMatches });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const panelSchema = z.object({
  judgeSlotIds: z.array(z.string()).min(1).max(5),
});

type Context = { params: Promise<{ matchId: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    const { matchId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const match = await prisma.battleMatch.findUnique({
      where: { id: matchId },
      include: {
        category: {
          select: {
            event: { select: { organizerId: true } },
            judgeSlots: { where: { isActive: true }, select: { id: true, name: true, code: true } },
          },
        },
        judgeAssignments: { include: { judgeSlot: { select: { id: true, name: true, code: true } } } },
      },
    });

    if (!match) return notFound("Match");
    if (match.category.event.organizerId !== user.id) return forbidden();

    return NextResponse.json({
      assigned: match.judgeAssignments,
      available: match.category.judgeSlots,
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { matchId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const parsed = panelSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Select between 1 and 5 judges");

    const match = await prisma.battleMatch.findUnique({
      where: { id: matchId },
      include: { category: { include: { event: { select: { organizerId: true } } } } },
    });

    if (!match) return notFound("Match");
    if (match.category.event.organizerId !== user.id) return forbidden();

    const judgeSlots = await prisma.judgeSlot.findMany({
      where: { id: { in: parsed.data.judgeSlotIds }, categoryId: match.categoryId, isActive: true },
      select: { id: true },
    });

    if (judgeSlots.length !== parsed.data.judgeSlotIds.length) {
      return badRequest("One or more judge slots are not valid for this category");
    }

    await prisma.$transaction([
      prisma.judgeAssignment.deleteMany({ where: { matchId } }),
      ...judgeSlots.map((slot, index) =>
        prisma.judgeAssignment.create({
          data: { matchId, judgeSlotId: slot.id, panelOrder: index + 1 },
        }),
      ),
    ]);

    const assignments = await prisma.judgeAssignment.findMany({
      where: { matchId },
      include: { judgeSlot: { select: { id: true, name: true, code: true } } },
      orderBy: { panelOrder: "asc" },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

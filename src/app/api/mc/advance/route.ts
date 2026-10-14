import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, serverError } from "@/lib/api";
import { AdvanceError, advancePhaseCore } from "@/lib/phase-advance";
import { prisma } from "@/lib/prisma";
import { getStaffSession } from "@/lib/staff-codes";

const bodySchema = z.object({
  categoryId: z.string().min(1),
  advanceCount: z.number().int().min(1).max(512).nullish(),
});

export async function POST(request: Request) {
  try {
    const session = await getStaffSession();
    if (!session) return forbidden();

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("categoryId is required");

    const event = await prisma.event.findUnique({
      where: { id: session.eventId },
      select: { organizerId: true },
    });
    if (!event) return forbidden();

    const belongs = await prisma.category.findFirst({
      where: { id: parsed.data.categoryId, eventId: session.eventId },
      select: { id: true },
    });
    if (!belongs) return forbidden();

    const result = await advancePhaseCore({
      categoryId: parsed.data.categoryId,
      organizerId: event.organizerId,
      advanceCountOverride: parsed.data.advanceCount ?? null,
      changedBy: `staff:${session.codeId}`,
      reason: `Advanced from ${session.role} portal (${session.label})`,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdvanceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return serverError();
  }
}

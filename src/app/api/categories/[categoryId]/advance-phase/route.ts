import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api";
import { BracketError } from "@/lib/bracket";
import { AdvanceError, advancePhaseCore } from "@/lib/phase-advance";
import { getCurrentUser } from "@/lib/rbac";

type Context = { params: Promise<{ categoryId: string }> };

const bodySchema = z.object({
  advanceCount: z.number().int().min(1).max(512).nullish(),
  reason: z.string().max(280).nullish(),
});

export async function POST(request: Request, { params }: Context) {
  try {
    const { categoryId } = await params;
    const user = await getCurrentUser();

    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const parsed = bodySchema.safeParse((await request.json().catch(() => null)) ?? {});
    if (!parsed.success) return badRequest("Invalid request body");

    const result = await advancePhaseCore({
      categoryId,
      organizerId: user.id,
      advanceCountOverride: parsed.data?.advanceCount ?? null,
      changedBy: user.id,
      reason: parsed.data?.reason ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdvanceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BracketError) return badRequest(error.message);
    console.error(error);
    return serverError();
  }
}

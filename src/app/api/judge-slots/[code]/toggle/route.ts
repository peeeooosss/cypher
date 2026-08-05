import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const toggleSchema = z.object({
  isActive: z.boolean(),
});

type Context = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Context) {
  const { code } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const slot = await prisma.judgeSlot.findUnique({
    where: { code },
    include: { event: { select: { organizerId: true } } },
  });

  if (!slot) {
    return notFound("Judge slot");
  }

  if (slot.event.organizerId !== user.id) {
    return forbidden();
  }

  const parsed = toggleSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest("isActive must be a boolean");
  }

  const updated = await prisma.judgeSlot.update({
    where: { code },
    data: { isActive: parsed.data.isActive },
  });

  return NextResponse.json(updated);
}

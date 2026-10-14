import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ eventId: string; codeId: string }> };

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  label: z.string().trim().min(1).max(60).optional(),
});

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { eventId, codeId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();
    if (!(await getEventForOwner(eventId, user.id))) return forbidden();

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Invalid update");

    const existing = await prisma.eventStaffCode.findFirst({
      where: { id: codeId, eventId },
      select: { id: true },
    });
    if (!existing) return notFound("Code");

    const updated = await prisma.eventStaffCode.update({
      where: { id: codeId },
      data: parsed.data,
      select: {
        id: true,
        label: true,
        role: true,
        codeHint: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function DELETE(_: Request, { params }: Context) {
  try {
    const { eventId, codeId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();
    if (!(await getEventForOwner(eventId, user.id))) return forbidden();

    const existing = await prisma.eventStaffCode.findFirst({
      where: { id: codeId, eventId },
      select: { id: true },
    });
    if (!existing) return notFound("Code");

    await prisma.eventStaffCode.delete({ where: { id: codeId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

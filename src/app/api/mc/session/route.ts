import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { clearStaffSession, createStaffSession, getStaffSession, hashStaffCode } from "@/lib/staff-codes";
import { isBattleType } from "@/lib/event-types";

const bodySchema = z.object({ code: z.string().trim().min(1).max(40) });

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Enter your MC / Host code");

    const code = await prisma.eventStaffCode.findUnique({
      where: { codeHash: hashStaffCode(parsed.data.code) },
      include: { event: { select: { id: true, title: true, eventType: true, status: true } } },
    });

    if (!code || !code.isActive) return unauthorized();

    await prisma.eventStaffCode.update({
      where: { id: code.id },
      data: { lastUsedAt: new Date() },
    });
    await createStaffSession(code.id);

    return NextResponse.json({
      eventId: code.eventId,
      eventTitle: code.event.title,
      label: code.label,
      role: code.role,
      portal: isBattleType(code.event.eventType) ? "MC Portal" : "Host Portal",
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function DELETE() {
  await clearStaffSession();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  try {
    const session = await getStaffSession();
    if (!session) return forbidden();
    const event = await prisma.event.findUnique({
      where: { id: session.eventId },
      select: { id: true, title: true, eventType: true, status: true },
    });
    if (!event) return forbidden();
    return NextResponse.json({
      eventId: event.id,
      eventTitle: event.title,
      label: session.label,
      role: session.role,
      portal: isBattleType(event.eventType) ? "MC Portal" : "Host Portal",
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

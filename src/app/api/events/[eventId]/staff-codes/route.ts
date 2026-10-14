import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { generateStaffCode, hashStaffCode } from "@/lib/staff-codes";

type Context = { params: Promise<{ eventId: string }> };

const createSchema = z.object({
  label: z.string().trim().min(1).max(60),
  role: z.enum(["MC", "HOST"]).default("MC"),
});

function mask(code: { id: string; label: string; role: string; codeHint: string; isActive: boolean; lastUsedAt: Date | null; createdAt: Date }) {
  return code;
}

export async function GET(_: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();
    if (!(await getEventForOwner(eventId, user.id))) return forbidden();

    const codes = await prisma.eventStaffCode.findMany({
      where: { eventId },
      select: {
        id: true,
        label: true,
        role: true,
        codeHint: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(codes.map(mask));
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();
    if (!(await getEventForOwner(eventId, user.id))) return forbidden();

    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Give the code a label");

    const plain = generateStaffCode();
    const created = await prisma.eventStaffCode.create({
      data: {
        eventId,
        label: parsed.data.label,
        role: parsed.data.role,
        codeHash: hashStaffCode(plain),
        codeHint: plain.slice(-4),
        createdBy: user.id,
      },
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

    // The plain code is returned exactly once — share it with the MC/Host now.
    return NextResponse.json({ ...created, code: plain }, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { badRequest, conflict, forbidden, isUniqueConstraintError, notFound, serverError, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const createSlotSchema = z.object({
  categoryId: z.string().cuid(),
  name: z.string().trim().max(80).optional(),
  judgeUserId: z.string().cuid().optional(),
});

type Context = { params: Promise<{ eventId: string }> };

function generateCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
}

export async function GET(_: Request, { params }: Context) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  if (!(await getEventForOwner(eventId, user.id))) {
    return notFound("Event");
  }

  const slots = await prisma.judgeSlot.findMany({
    where: { eventId },
    include: {
      category: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(slots);
}

export async function POST(request: Request, { params }: Context) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  if (!(await getEventForOwner(eventId, user.id))) {
    return notFound("Event");
  }

  const parsed = createSlotSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid slot data");
  }

  const { categoryId, name, judgeUserId } = parsed.data;

  const category = await prisma.category.findFirst({
    where: { id: categoryId, eventId },
    select: { id: true },
  });

  if (!category) {
    return notFound("Category");
  }

  let resolvedName = name ?? null;
  let resolvedJudgeUserId = judgeUserId ?? null;

  if (judgeUserId) {
    const artist = await prisma.user.findFirst({
      where: { id: judgeUserId, role: "ARTIST", isSuspended: false },
      select: { id: true, name: true },
    });

    if (!artist) {
      return badRequest("Selected artist is not an active artist account");
    }

    resolvedJudgeUserId = artist.id;
    resolvedName = artist.name ?? resolvedName;
  }

  if (!resolvedName && !resolvedJudgeUserId) {
    return badRequest("Judge name is required");
  }

  const slotCount = await prisma.judgeSlot.count({
    where: { categoryId },
  });

  if (slotCount >= 5) {
    return conflict("Maximum of 5 judge slots per category reached");
  }

  async function getUniqueCode(): Promise<string> {
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const code = generateCode();
      const existing = await prisma.judgeSlot.findUnique({
        where: { code },
        select: { id: true },
      });

      if (!existing) {
        return code;
      }

      attempts++;
    }

    throw new Error("Unable to generate unique code");
  }

  try {
    const code = await getUniqueCode();

    const slot = await prisma.judgeSlot.create({
      data: {
        code,
        name: resolvedName,
        judgeUserId: resolvedJudgeUserId,
        eventId,
        categoryId,
      },
    });

    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("A slot with this code already exists");
    }

    console.error(error);
    return serverError();
  }
}

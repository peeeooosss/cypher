import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, conflict, forbidden, isUniqueConstraintError, notFound, serverError, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  maxCompetitors: z.number().int().positive().max(256).nullable().optional(),
  entryFee: z.number().int().min(0).max(10000000).nullable().optional(),
  entryCurrency: z.string().trim().min(1).max(8).default("INR"),
});

type CategoryRouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_: Request, { params }: CategoryRouteContext) {
  const { eventId } = await params;
  const categories = await prisma.category.findMany({
    where: { eventId },
    include: { _count: { select: { registrations: true, matches: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request, { params }: CategoryRouteContext) {
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

  const parsed = categorySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid category data");
  }

  try {
    const category = await prisma.category.create({
      data: { ...parsed.data, event: { connect: { id: eventId } } },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("This event already has a category with that name");
    }

    console.error(error);
    return serverError();
  }
}

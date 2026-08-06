import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, conflict, forbidden, isUniqueConstraintError, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  maxCompetitors: z.number().int().positive().max(256).nullable().optional(),
  entryFee: z.number().int().min(0).max(10000000).nullable().optional(),
  entryCurrency: z.string().trim().min(1).max(8).optional(),
});

type CategoryRouteContext = { params: Promise<{ categoryId: string }> };

export async function PATCH(request: Request, { params }: CategoryRouteContext) {
  const { categoryId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { event: { select: { organizerId: true } } },
  });

  if (!category) {
    return notFound("Category");
  }

  if (category.event.organizerId !== user.id) {
    return forbidden();
  }

  const parsed = updateCategorySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid category data");
  }

  try {
    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: parsed.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("This event already has a category with that name");
    }

    console.error(error);
    return serverError();
  }
}

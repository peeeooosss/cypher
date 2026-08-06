import { NextResponse } from "next/server";
import { z } from "zod";
import { EventStatus, RegistrationStatus } from "@/generated/prisma/enums";
import { badRequest, conflict, forbidden, isUniqueConstraintError, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const registrationSchema = z
  .object({
    categoryId: z.string().cuid().optional(),
    categoryIds: z.array(z.string().cuid()).min(1).optional(),
    style: z.string().trim().max(80).optional(),
    crew: z.string().trim().max(120).optional(),
    city: z.string().trim().max(120).optional(),
    country: z.string().trim().max(2).optional(),
    experience: z.string().trim().max(50).optional(),
    socialHandle: z.string().trim().max(120).optional(),
    referral: z.string().trim().max(200).optional(),
  })
  .refine((data) => data.categoryId !== undefined || data.categoryIds !== undefined, {
    message: "Category is required",
  });

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const registrations = await prisma.registration.findMany({
    where: { userId: user.id },
    include: {
      category: { include: { event: { select: { id: true, title: true, startsAt: true, status: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(registrations);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ARTIST") {
    return forbidden();
  }

  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid registration data");
  }

  const categoryIds = parsed.data.categoryIds ?? (parsed.data.categoryId ? [parsed.data.categoryId] : []);

  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    include: { event: { select: { id: true, status: true } } },
  });

  if (categories.length !== categoryIds.length) {
    return notFound("Category");
  }

  if (categories.some((category) => category.event.status === EventStatus.COMPLETED || category.event.status === EventStatus.CANCELLED)) {
    return conflict("Registration is closed for this event");
  }

  try {
    const { categoryId, categoryIds: _categoryIds, ...profileFields } = parsed.data;
    void categoryId;
    void _categoryIds;

    const existing = await prisma.registration.findMany({
      where: { userId: user.id, categoryId: { in: categoryIds }, status: { not: RegistrationStatus.WITHDRAWN } },
      select: { categoryId: true },
    });

    if (existing.length > 0) {
      return conflict("You are already registered for one of these categories");
    }

    const registrations = await prisma.$transaction(
      categories.map((category) =>
        prisma.registration.create({
          data: {
            user: { connect: { id: user.id } },
            category: { connect: { id: category.id } },
            entryFee: category.entryFee,
            entryCurrency: category.entryCurrency,
            ...profileFields,
          },
          include: { category: true },
        }),
      ),
    );

    return NextResponse.json(registrations, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("You are already registered for one of these categories");
    }

    console.error(error);
    return serverError();
  }
}

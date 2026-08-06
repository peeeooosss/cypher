import { NextResponse } from "next/server";
import { z } from "zod";
import { EventStatus } from "@/generated/prisma/enums";
import { badRequest, conflict, forbidden, isUniqueConstraintError, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const registrationSchema = z.object({
  categoryId: z.string().cuid(),
  style: z.string().trim().max(80).optional(),
  crew: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().max(2).optional(),
  experience: z.string().trim().max(50).optional(),
  socialHandle: z.string().trim().max(120).optional(),
  referral: z.string().trim().max(200).optional(),
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

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
    include: { event: { select: { id: true, status: true } } },
  });

  if (!category) {
    return notFound("Category");
  }

  if (category.event.status === EventStatus.COMPLETED || category.event.status === EventStatus.CANCELLED) {
    return conflict("Registration is closed for this event");
  }

  try {
    const { categoryId, ...profileFields } = parsed.data;
    void categoryId;
    const registration = await prisma.registration.create({
      data: {
        user: { connect: { id: user.id } },
        category: { connect: { id: category.id } },
        entryFee: category.entryFee,
        entryCurrency: category.entryCurrency,
        ...profileFields,
      },
      include: { category: true },
    });

    return NextResponse.json(registration, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("You are already registered for this category");
    }

    console.error(error);
    return serverError();
  }
}

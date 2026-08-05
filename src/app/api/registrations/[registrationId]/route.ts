import { NextResponse } from "next/server";
import { z } from "zod";
import { RegistrationStatus } from "@/generated/prisma/enums";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const updateRegistrationSchema = z.object({
  status: z.enum(RegistrationStatus),
});

type RegistrationRouteContext = { params: Promise<{ registrationId: string }> };

export async function PATCH(request: Request, { params }: RegistrationRouteContext) {
  const { registrationId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { category: { include: { event: { select: { organizerId: true } } } } },
  });

  if (!registration) {
    return notFound("Registration");
  }

  const isOwner = registration.userId === user.id;
  const isEventOrganizer = registration.category.event.organizerId === user.id;

  if (!isOwner && !isEventOrganizer) {
    return forbidden();
  }

  const parsed = updateRegistrationSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid registration status");
  }

  if (isOwner && parsed.data.status !== RegistrationStatus.WITHDRAWN) {
    return forbidden();
  }

  const updated = await prisma.registration.update({
    where: { id: registrationId },
    data: { status: parsed.data.status },
  });

  return NextResponse.json(updated);
}

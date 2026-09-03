import { NextResponse } from "next/server";
import { z } from "zod";
import { RegistrationMemberStatus, RegistrationStatus } from "@/generated/prisma/enums";
import { badRequest, conflict, forbidden, isUniqueConstraintError, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const updateRegistrationSchema = z.object({
  status: z.enum(RegistrationStatus).optional(),
  paid: z.boolean().optional(),
  paidClaimed: z.literal(true).optional(),
  seed: z.number().int().min(0).optional(),
  style: z.string().trim().max(80).optional(),
  crew: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().max(2).optional(),
  experience: z.string().trim().max(50).optional(),
  socialHandle: z.string().trim().max(120).optional(),
  referral: z.string().trim().max(200).optional(),
});

type RegistrationRouteContext = { params: Promise<{ registrationId: string }> };

export async function PATCH(request: Request, { params }: RegistrationRouteContext) {
  const { registrationId } = await params;

  if (!z.string().cuid().safeParse(registrationId).success) {
    return notFound("Registration");
  }

  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorized();
    }

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        category: { include: { event: { select: { organizerId: true } } } },
        members: true,
      },
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
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    if (isOwner && parsed.data.status && parsed.data.status !== RegistrationStatus.WITHDRAWN) {
      return forbidden();
    }

    if (isOwner && parsed.data.paid !== undefined) {
      return forbidden();
    }

    if (isOwner && parsed.data.paidClaimed !== undefined) {
      if (registration.paid || registration.paidClaimedAt) {
        return badRequest("Payment already reported for this registration");
      }
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (isEventOrganizer) {
      if (parsed.data.seed !== undefined) updateData.seed = parsed.data.seed;
      if (parsed.data.paid !== undefined) {
        if (parsed.data.paid && registration.members.length > 0 && registration.members.some((member) => member.status !== RegistrationMemberStatus.ACCEPTED)) {
          return badRequest("Every invited team member must accept before payment can be confirmed");
        }
        updateData.paid = parsed.data.paid;
        updateData.paidAt = parsed.data.paid ? new Date() : null;
        updateData.rosterLockedAt = parsed.data.paid ? new Date() : null;
        if (parsed.data.paid) updateData.status = RegistrationStatus.CONFIRMED;
      }
    }
    for (const field of ["style", "crew", "city", "country", "experience", "socialHandle", "referral"] as const) {
      if (parsed.data[field] !== undefined) updateData[field] = parsed.data[field];
    }
    if (isOwner && parsed.data.paidClaimed !== undefined) {
      if (registration.members.length > 0 && registration.members.some((member) => member.status !== RegistrationMemberStatus.ACCEPTED)) {
        return badRequest("Every invited team member must accept before payment can be reported");
      }
      updateData.paidClaimedAt = new Date();
    }

    const updated = await prisma.registration.update({
      where: { id: registrationId },
      data: updateData,
      include: { category: { include: { event: { select: { id: true, title: true } } } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isUniqueConstraintError(error)) return conflict("One of these artists is already registered for this category");
    console.error(error);
    return serverError();
  }
}

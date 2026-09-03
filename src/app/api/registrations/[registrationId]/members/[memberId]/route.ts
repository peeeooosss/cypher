import { NextResponse } from "next/server";
import { z } from "zod";
import { RegistrationMemberStatus, RegistrationStatus } from "@/generated/prisma/enums";
import { badRequest, conflict, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const memberActionSchema = z.object({ status: z.enum([RegistrationMemberStatus.ACCEPTED, RegistrationMemberStatus.DECLINED, RegistrationMemberStatus.REMOVED]) });
type Context = { params: Promise<{ registrationId: string; memberId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { registrationId, memberId } = await params;

  const idCheck = z.object({ registrationId: z.string().cuid(), memberId: z.string().cuid() }).safeParse({ registrationId, memberId });
  if (!idCheck.success) {
    return notFound("Team member");
  }

  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = memberActionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Invalid membership action");

    const member = await prisma.registrationMember.findFirst({
      where: { id: memberId, registrationId },
      include: {
        user: true,
        registration: { include: { category: { include: { event: { select: { organizerId: true } } } } } },
      },
    });
    if (!member) return notFound("Team member");

    // The captain is the owner of the registration — not the member row being modified.
    const isCaptain = member.registration.userId === user.id;
    const isMember = member.userId === user.id;
    const isOrganizer = member.registration.category.event.organizerId === user.id;
    if (!isCaptain && !isMember && !isOrganizer) return forbidden();

    if (parsed.data.status === RegistrationMemberStatus.REMOVED && !isCaptain && !isOrganizer) {
      return forbidden();
    }
    if (parsed.data.status === RegistrationMemberStatus.ACCEPTED && !isMember && !isOrganizer) return forbidden();
    if (parsed.data.status === RegistrationMemberStatus.DECLINED && !isMember) return forbidden();
    if (parsed.data.status === RegistrationMemberStatus.ACCEPTED && [member.user.style, member.user.city, member.user.country, member.user.experience, member.user.socialHandle].some((value) => !value)) {
      return badRequest("Complete your artist profile before joining a team");
    }
    if (member.registration.paid || member.registration.rosterLockedAt || member.registration.status !== RegistrationStatus.PENDING) {
      return conflict("This roster is locked");
    }

    const updated = await prisma.registrationMember.update({
      where: { id: member.id },
      data: {
        status: parsed.data.status,
        acceptedAt: parsed.data.status === RegistrationMemberStatus.ACCEPTED ? new Date() : null,
      },
      include: { user: { select: { id: true, name: true, username: true } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

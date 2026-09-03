import { NextResponse } from "next/server";
import { RegistrationMemberStatus } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/rbac";
import { serverError, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const invitations = await prisma.registrationMember.findMany({
      where: { userId: user.id, status: RegistrationMemberStatus.PENDING },
      include: {
        registration: {
          select: {
            id: true,
            teamName: true,
            category: { select: { name: true, format: true, event: { select: { title: true, slug: true, startsAt: true } } } },
            user: { select: { name: true, username: true } },
          },
        },
      },
      orderBy: { invitedAt: "desc" },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

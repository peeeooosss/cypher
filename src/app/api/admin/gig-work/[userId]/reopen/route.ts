import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ userId: string }> };

export async function POST(_request: Request, { params }: Context) {
  const { userId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ADMIN") {
    return forbidden();
  }

  try {
    const artist = await prisma.user.findFirst({
      where: { id: userId, role: "ARTIST" },
      select: { id: true },
    });

    if (!artist) {
      return notFound("Artist");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        gigWorkPaymentStatus: "NONE",
        gigWorkPaymentMethod: null,
        gigWorkPaymentSentAt: null,
        gigWorkPaymentVerifiedBy: null,
        gigWorkPaidAt: null,
        gigWorkEnabledAt: null,
        gigWorkExpiresAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        gigWorkPaymentStatus: true,
        gigWorkPaidAt: true,
        gigWorkEnabledAt: true,
        gigWorkExpiresAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { gigWorkExpiryFrom } from "@/lib/pricing";
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
      select: { id: true, gigWorkPaymentStatus: true },
    });

    if (!artist) {
      return notFound("Artist");
    }

    if (artist.gigWorkPaymentStatus !== "PENDING") {
      return NextResponse.json(
        { error: "Artist has no gig work payment waiting for verification" },
        { status: 400 },
      );
    }

    const paidAt = new Date();

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        gigWorkPaymentStatus: "VERIFIED",
        gigWorkPaymentVerifiedBy: user.email,
        gigWorkPaidAt: paidAt,
        gigWorkEnabledAt: paidAt,
        gigWorkExpiresAt: gigWorkExpiryFrom(paidAt),
      },
      select: {
        id: true,
        name: true,
        email: true,
        gigWorkPaymentStatus: true,
        gigWorkPaymentVerifiedBy: true,
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

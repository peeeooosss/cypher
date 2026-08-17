import { NextResponse } from "next/server";
import { conflict, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ agreementId: string }> };

export async function POST(_: Request, { params }: Context) {
  const { agreementId } = await params;
  const user = await getCurrentUser();

  if (!user) return unauthorized();
  if (user.role !== "ARTIST") return forbidden();

  const agreement = await prisma.gigAgreement.findFirst({
    where: { id: agreementId, artistId: user.id },
    select: { id: true, status: true },
  });
  if (!agreement) return notFound("Agreement");
  if (agreement.status !== "PENDING_ARTIST") {
    return conflict("This offer can no longer be declined");
  }

  try {
    const updated = await prisma.gigAgreement.update({
      where: { id: agreementId },
      data: { status: "CANCELLED" },
      select: { id: true, status: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ achievementId: string }> };

export async function DELETE(_: Request, { params }: Context) {
  const { achievementId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ARTIST") {
    return forbidden();
  }

  const existing = await prisma.artistAchievement.findFirst({
    where: { id: achievementId, userId: user.id },
    select: { id: true },
  });

  if (!existing) {
    return notFound("Achievement");
  }

  try {
    await prisma.artistAchievement.delete({ where: { id: achievementId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

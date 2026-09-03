import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: Context) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ARTIST") return forbidden();

    const owned = await prisma.artistAvailability.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!owned) return notFound("Availability");

    await prisma.artistAvailability.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

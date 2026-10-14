import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ categoryId: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    const { categoryId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ORGANIZER") return forbidden();

    const category = await prisma.category.findFirst({
      where: { id: categoryId },
      include: { event: { select: { organizerId: true } } },
    });
    if (!category) return notFound("Category");
    if (category.event.organizerId !== user.id) return forbidden();

    const trail = await prisma.advancementAudit.findMany({
      where: { categoryId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json(trail);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

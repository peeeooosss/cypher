import { NextResponse } from "next/server";
import { notFound } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ categoryId: string }> };

export async function GET(_: Request, { params }: Context) {
  const { categoryId } = await params;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });

  if (!category) {
    return notFound("Category");
  }

  const slots = await prisma.judgeSlot.findMany({
    where: { categoryId },
    select: { id: true, code: true, name: true, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(slots);
}

import { NextResponse } from "next/server";
import { notFound } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ code: string }> };

export async function GET(_: Request, { params }: Context) {
  const { code } = await params;

  const slot = await prisma.judgeSlot.findUnique({
    where: { code },
    include: {
      category: {
        select: { id: true, name: true, event: { select: { id: true, title: true } } },
      },
    },
  });

  if (!slot) {
    return notFound("Judge slot");
  }

  const matches = await prisma.battleMatch.findMany({
    where: { categoryId: slot.categoryId },
    include: {
      competitorA: { include: { user: { select: { name: true } } } },
      competitorB: { include: { user: { select: { name: true } } } },
      scores: true,
    },
    orderBy: [{ round: "asc" }, { position: "asc" }],
  });

  return NextResponse.json({
    ...slot,
    matches,
  });
}

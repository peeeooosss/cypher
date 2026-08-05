import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { RoundType } from "@/generated/prisma/enums";

type Context = { params: Promise<{ categoryId: string }> };

const createRoundSchema = z.object({
  type: z.nativeEnum(RoundType),
  label: z.string().optional(),
  roundCount: z.number().int().min(1).default(1),
  roundDuration: z.number().int().optional(),
  advanceCount: z.number().int().optional(),
});

export async function GET(_request: Request, context: Context) {
  const { categoryId } = await context.params;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return notFound("Category");

  const rounds = await prisma.roundFormat.findMany({
    where: { categoryId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(rounds);
}

export async function POST(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { categoryId } = await context.params;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { event: { select: { organizerId: true } } },
  });
  if (!category) return notFound("Category");
  if (category.event.organizerId !== user.id) return forbidden();

  const body = createRoundSchema.safeParse(await request.json());
  if (!body.success) return badRequest(body.error.issues[0].message);

  const { type, label, roundCount, roundDuration, advanceCount } = body.data;

  const maxOrder = await prisma.roundFormat.aggregate({
    where: { categoryId },
    _max: { order: true },
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  const round = await prisma.roundFormat.create({
    data: {
      categoryId,
      type,
      label,
      roundCount,
      roundDuration,
      advanceCount,
      order,
    },
  });

  return NextResponse.json(round, { status: 201 });
}

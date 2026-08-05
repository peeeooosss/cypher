import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ categoryId: string }> };

const distributionEntrySchema = z.object({
  rank: z.number().int().min(1),
  label: z.string(),
  pct: z.number().min(0).max(100),
});

const createPrizePoolSchema = z.object({
  totalAmount: z.number().int().min(0),
  currency: z.string().default("USD"),
  distribution: z.array(distributionEntrySchema).refine(
    (entries) => {
      const sum = entries.reduce((acc, e) => acc + e.pct, 0);
      return sum === 100;
    },
    { message: "Distribution percentages must sum to 100" },
  ),
});

const updatePrizePoolSchema = z.object({
  totalAmount: z.number().int().min(0).optional(),
  currency: z.string().optional(),
  distribution: z.array(distributionEntrySchema).refine(
    (entries) => {
      const sum = entries.reduce((acc, e) => acc + e.pct, 0);
      return sum === 100;
    },
    { message: "Distribution percentages must sum to 100" },
  ).optional(),
  isPaid: z.boolean().optional(),
});

export async function GET(_request: Request, context: Context) {
  const { categoryId } = await context.params;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return notFound("Category");

  const prizePool = await prisma.prizePool.findUnique({
    where: { categoryId },
  });

  if (!prizePool) return notFound("PrizePool");

  return NextResponse.json(prizePool);
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

  const body = createPrizePoolSchema.safeParse(await request.json());
  if (!body.success) return badRequest(body.error.issues[0].message);

  const { totalAmount, currency, distribution } = body.data;

  const prizePool = await prisma.prizePool.create({
    data: {
      categoryId,
      totalAmount,
      currency,
      distribution,
    },
  });

  return NextResponse.json(prizePool, { status: 201 });
}

export async function PATCH(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { categoryId } = await context.params;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { event: { select: { organizerId: true } } },
  });
  if (!category) return notFound("Category");
  if (category.event.organizerId !== user.id) return forbidden();

  const existing = await prisma.prizePool.findUnique({
    where: { categoryId },
  });
  if (!existing) return notFound("PrizePool");

  const body = updatePrizePoolSchema.safeParse(await request.json());
  if (!body.success) return badRequest(body.error.issues[0].message);

  const updated = await prisma.prizePool.update({
    where: { categoryId },
    data: body.data,
  });

  return NextResponse.json(updated);
}

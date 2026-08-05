import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const templateSchema = z.object({
  text: z.string().trim().min(1).max(500).optional(),
  scoreLabel: z.string().trim().max(100).optional().nullable(),
  minScore: z.coerce.number().int().min(0).max(99).optional(),
  maxScore: z.coerce.number().int().min(1).max(100).optional(),
  category: z.string().trim().max(100).optional().nullable(),
});

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const owned = await prisma.feedbackTemplate.findFirst({
    where: { id, organizerId: user.id },
    select: { id: true },
  });

  if (!owned) {
    return notFound("Feedback template");
  }

  const parsed = templateSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid template data");
  }

  const template = await prisma.feedbackTemplate.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(template);
}

export async function DELETE(_: Request, { params }: Context) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const owned = await prisma.feedbackTemplate.findFirst({
    where: { id, organizerId: user.id },
    select: { id: true },
  });

  if (!owned) {
    return notFound("Feedback template");
  }

  await prisma.feedbackTemplate.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}

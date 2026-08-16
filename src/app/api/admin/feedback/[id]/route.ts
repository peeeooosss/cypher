import { NextResponse } from "next/server";
import { z } from "zod";
import { FeedbackStatus } from "@/generated/prisma/enums";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { getAdminFeedbackItem } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const statusSchema = z.object({
  status: z.nativeEnum(FeedbackStatus),
});

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ADMIN") {
    return forbidden();
  }

  return null;
}

export async function GET(_: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const item = await getAdminFeedbackItem(id);

  if (!item) {
    return notFound("Feedback");
  }

  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const user = await getCurrentUser();
  const parsed = statusSchema.safeParse(await req.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid status");
  }

  const existing = await getAdminFeedbackItem(id);
  if (!existing) {
    return notFound("Feedback");
  }

  const isClosed =
    parsed.data.status === FeedbackStatus.COMPLETED ||
    parsed.data.status === FeedbackStatus.REJECTED;

  try {
    const updated = await prisma.feedback.update({
      where: { id },
      data: {
        status: parsed.data.status,
        resolvedBy: isClosed ? user?.id ?? null : null,
        resolvedAt: isClosed ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const reorderSchema = z.object({
  works: z.array(z.object({
    id: z.string(),
    order: z.number().int().min(0),
  })).min(1),
});

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = reorderSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    await prisma.$transaction(
      parsed.data.works.map(({ id, order }) =>
        prisma.artistWork.update({
          where: { id, userId: user.id },
          data: { order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
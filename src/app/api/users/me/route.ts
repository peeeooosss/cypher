import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  upiId: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value)),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const parsed = updateMeSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid data");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
    select: { id: true, name: true, email: true, upiId: true },
  });

  return NextResponse.json(updated);
}

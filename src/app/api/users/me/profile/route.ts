import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  studioName: z.string().trim().min(1).max(100),
  studioFoundedAt: z.coerce.date().optional().nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { studioName: true, studioFoundedAt: true },
  });

  return NextResponse.json(profile);
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      studioName: parsed.data.studioName,
      studioFoundedAt: parsed.data.studioFoundedAt,
    },
    select: { studioName: true, studioFoundedAt: true, studioLogoUrl: true },
  });

  return NextResponse.json(updated);
}
